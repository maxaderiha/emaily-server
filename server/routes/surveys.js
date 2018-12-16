import mongoose, { set } from 'mongoose';
import { Path } from 'path-parser';
import { URL } from 'url';

import { authCheck, creditsCheck } from 'middlewares';
import { getSurveyTemplate } from 'services/emailTemplates';
import { Mailer } from 'services/Mailer';

const Survey = mongoose.model('surveys');

export default app => {
  app.post('/api/surveys', authCheck, creditsCheck, async (req, res) => {
    const { user } = req;
    const { title, subject, body, recipientEmails } = req.body;
    const recipients = recipientEmails.split(',').map(email => ({ email: email.trim() }));

    const survey = new Survey({
      body,
      title,
      subject,
      recipients,
      _user: user.id,
    });

    const mailer = new Mailer(survey, getSurveyTemplate(survey));

    try {
      await mailer.send();
      await survey.save();

      user.credits -= 1;
      const updatedUser = await user.save();

      res.send(updatedUser);
    } catch (error) {
      res.status(422).send(error);
    }
  });

  app.post('/api/surveys/webhooks', (req, res) => {
    const pairs = new Set();
    const transformer = ({ email, url }) => {
      const { pathname } = new URL(url);
      const match =  new Path('/api/surveys/:surveyId/:choice').test(pathname);

      if (match) return { email, ...match };
    };
    const predicate = ({ email, surveyId }) => {
      const pair = `${email}${surveyId}`;

      return pairs.has(pair) ? false : pairs.add(pair);
    };

    const uniqEvents = Object.values(req.body)
      .map(transformer)
      .filter(Boolean)
      .filter(predicate);
  });

  app.get('/api/surveys/thank', (req, res) => {
    res.send('Thanks for the answer!');
  });
};
