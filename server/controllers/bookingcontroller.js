import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import stripe, { Stripe } from "stripe";



export const createBooking = async (req, res) => {
  try {
    const userId = req.auth && req.auth.userId;
    const { showId, selectedSeats } = req.body;
    const { origin } = req.headers;
    //check if the selected seats are still available or not
        // Ensure `occupiedSeats` is an object (migrate old array shape if present)
        const existingShow = await Show.findById(showId);
        if (!existingShow) {
          return res.json({ success: false, message: "Show not found" });
        }

        if (Array.isArray(existingShow.occupiedSeats)) {
          const migrated = {};
          existingShow.occupiedSeats.forEach((item) => {
            if (!item) return;
            if (typeof item === "string") migrated[item] = true;
            else if (typeof item === "object") {
              Object.keys(item).forEach((k) => (migrated[k] = item[k]));
            }
          });
          existingShow.occupiedSeats = migrated;
          await existingShow.save();
        }

        // Try to atomically mark seats as occupied to avoid race conditions.
    const seatConditions = selectedSeats.map(
      (seat) => ({ [`occupiedSeats.${seat}`]: { $exists: false } })
    );

    const update = { $set: {} };
    selectedSeats.forEach((seat) => {
      update.$set[`occupiedSeats.${seat}`] = userId || true;
    });

    // find one show where none of the selected seats are occupied and set them
    const updatedShow = await Show.findOneAndUpdate(
      { _id: showId, $and: seatConditions },
      update,
      { new: true }
    ).populate("movie");

    if (!updatedShow) {
      return res.json({
        success: false,
        message: "Selected seats are already booked. Please choose different seats.",
      });
    }

    //create a booking and save it to the database
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: updatedShow.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
    });

    // console.log("Booking created:", { bookingId: booking._id, showId, seats: selectedSeats });
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    //creating line items for stripe

    const line_items = [{
      price_data :{
        currency : 'usd',
        product_data :{
          name : updatedShow.movie.title
        },
        unit_amount : Math.floor(booking.amount) * 100
      },
      quantity:1
    }]


    const session= await stripeInstance.checkout.sessions.create({
      success_url:`${origin}/loading/my-bookings`,
      cancel_url:`${origin}/my-bookings`,
      line_items:line_items,
      mode : 'payment',
      metadata:{
        bookingId:booking._id.toString()
      },
      expires_at : Math.floor(Date.now()/1000) + 30*60 // session expires in 30 minutes


    })
    booking.paymentLink = session.url
    await booking.save( )

    //Run inggest sheduler function to check payment status after 10 min

    await inngest.send({
      name:"app/checkpayment",
      data:{
          bookingId : booking._id.toString()
      }
    })

    res.json({ success: true, url : session.url});
  } catch (error) {

    console.log(error.message); 
    res.json({ success: false, message: error.message });
  }
};


export const getOccupiedSeats = async (req, res) => {
  try {
    
    const {showId} = req.params;
    const showData = await Show.findById(showId);
    const occupiedSeats = Object.keys(showData.occupiedSeats)
    res.json({ success: true, occupiedSeats });
  } catch (error) {
     console.log(error.message); 
    res.json({ success: false, message: error.message });

  }
}