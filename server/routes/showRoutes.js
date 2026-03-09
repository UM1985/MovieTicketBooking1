import { addShow, getNowPlayingMovies, getShow, getShows } from "../controllers/showController.js";
import express from "express"  
import { protectAdmin } from "../middleware/auth.js";


const showRouter = express.Router()

showRouter.get("/now-playing",protectAdmin ,getNowPlayingMovies)
showRouter.post("/add",protectAdmin, addShow)
showRouter.get("/all", getShows)
showRouter.get("/:movieId", getShow)
export default showRouter;