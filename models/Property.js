import mongoose from "mongoose";


const propertySchema = new mongoose.Schema(
  {
    title: { 
        type: String,
        required: true
        },
    description: {
        type: String,
        required: true
        },
    address: {
        type: String,
        required: true
        },
    price: {
        type: Number,   
        required: true
        },
    landlord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    images: [String],
    available: {
        type: Boolean,
        default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Property", propertySchema);