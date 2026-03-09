import Booking from "../models/Booking.js";
import Show from "../models/Show.js";

//functions to check avalibility of seats and to book the seats for a particular show

const checkSeatAvailability = async (showId, selectedSeats) => {
  const showData = await Show.findById(showId);
  const occupiedSeats = showData.occupiedSeats;

  const isAnySeatTaken = selectedSeats.some(
    (seat) => occupiedSeats[seat]
  );

  return !isAnySeatTaken;
};

export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { showId, selectedSeats } = req.body;
    const { origin } = req.headers;
    //check if the selected seats are still available or not
    const isAvailable = await checkSeatAvailability(showId, selectedSeats);
    if (!isAvailable) {
      return res.json({
        success: false,
        message:
          "Selected seats are already booked. Please choose different seats.",
      });
    }

    //get show details from the database
    const showData = await Show.findById(showId).populate("movie");

    //create a booking and save it to the database
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
    });

 selectedSeats.forEach((seat) => {
  showData.occupiedSeats[seat] = userId;
});
    showData.markModified("occupiedSeats");
    await showData.save();
    res.json({ success: true, message: "Booking created successfully" },booking);
  } catch (error) {

    console.log(error.message); 
    res.json({ success: false, message: error.message });
  }
};


export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;

    const showData = await Show.findById(showId);

    const occupiedSeats = Object.keys(showData.occupiedSeats || {});

    res.json({
      success: true,
      occupiedSeats
    });

  } catch (error) {
    console.log(error.message);
    res.json({ success:false, message:error.message });
  }
};