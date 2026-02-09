import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
{
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: true,
    },

    merchantReference: {
        type: String,
        required: true,
        unique: true,
    },

    orderTrackingId: {
        type: String,
        unique: true,
        sparse: true,
    },

    amount: Number,

    status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending",
    },

    confirmationCode: {
        type: String,
        unique: true,
        sparse: true,
    },

    paidAt: Date,

},
{ timestamps: true }
);

/*
CRITICAL: prevent same user paying same property twice
*/
orderSchema.index(
    { user: 1, property: 1 },
    { unique: true }
);

export default mongoose.model("Order", orderSchema);
