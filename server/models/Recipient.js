import mongoose from 'mongoose';

const { Schema } = mongoose;

const recipient = new Schema({ 
  email: String,
  responded: {
    type: Boolean,
    default: false,
  },
});

export default recipient;
