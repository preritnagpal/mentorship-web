import crypto from "crypto";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { Booking, Payment, AvailabilitySlot } from "@/models";
import { sendBookingMail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId
    } = body;

    // VALIDATION
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return NextResponse.json({
        success: false,
        error: "Missing payment details"
      });
    }

    // VERIFY SIGNATURE
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({
        success: false,
        error: "Payment verification failed"
      });
    }

    // FIND BOOKING + RELATIONS
    const booking = await Booking.findById(bookingId)
      .populate("studentId", "name email")
      .populate("mentorId", "name email")
      .populate("slotId", "startTime endTime date");

    if (!booking) {
      return NextResponse.json({
        success: false,
        error: "Booking not found"
      });
    }

    // PREVENT DOUBLE CONFIRM
    if (booking.status === "CONFIRMED") {
      return NextResponse.json({
        success: true,
        message: "Booking already confirmed"
      });
    }

    // UPDATE PAYMENT RECORD
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        status: "SUCCESS"
      },
      { new: true }
    );

    if (!payment) {
      return NextResponse.json({
        success: false,
        error: "Payment record not found"
      });
    }

    // SAFE SLOT LOCK (prevents race condition)
    const lockedSlot = await AvailabilitySlot.findOneAndUpdate(
      { _id: booking.slotId, isBooked: false },
      { isBooked: true },
      { new: true }
    );

    if (!lockedSlot) {
      return NextResponse.json({
        success: false,
        error: "Slot already booked"
      });
    }

    // CONFIRM BOOKING
    booking.status = "CONFIRMED";
    booking.paymentId = payment._id;

    await booking.save();

    // EXTRACT POPULATED DATA
    const student = booking.studentId as any;
    const mentor = booking.mentorId as any;
    const slot = booking.slotId as any;

    const startTime = new Date(slot.startTime).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });

    const endTime = new Date(slot.endTime).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });

    const formattedDate = new Date(slot.startTime).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    // SEND EMAIL SAFELY
    try {
      await sendBookingMail({
        studentEmail: student?.email,
        mentorEmail: mentor?.email,
        studentName: student?.name,
        mentorName: mentor?.name,
        date: formattedDate,
        time: `${startTime} - ${endTime}`
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and booking confirmed"
    });

  } catch (error: any) {
    console.error("Verify Payment Error:", error);

    return NextResponse.json({
      success: false,
      error: "Payment verification failed",
      details: error.message
    });
  }
}