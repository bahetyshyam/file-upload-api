import express from "express";
import bodyParser from "body-parser";
import "dotenv/config";
var cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
import compare from "./compareFunction";

const app = express();
const port = 8080;

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(
  cors({
    exposedHeaders: ["Content-Disposition"],
  })
);

// connection
const conn = mongoose.createConnection(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// init gfs
let gfs;
conn.once("open", async () => {
  // init stream
  gfs = await new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads",
  });
});

// Storage
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      if (
        file.mimetype === "image/jpeg" ||
        file.mimetype === "image/png" ||
        file.mimetype === "video/mp4" ||
        file.mimetype === "application/pdf"
      ) {
        const fileInfo = {
          filename: file.originalname,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      } else reject("Please upload PNG/JPEG/MP4/PDF formats only.");
    });
  },
});

const upload = multer({
  storage,
  onError: (err, next) => {
    next(err);
  },
});

app.post("/upload", upload.single("file"), (req, res) => {
  return res.json({
    success: "true",
    file: req.file,
  });
});

//Get all files Data
app.get("/files", (req, res) => {
  gfs.find().toArray((err, files) => {
    // check if files
    if (!files || files.length === 0) {
      files = [];
      return res.json(files);
    }

    files.sort(compare);

    return res.json(files);
  });
});

//Get Single File
app.get("/files/:id", (req, res) => {
  gfs
    .find({ _id: mongoose.Types.ObjectId(req.params.id) })
    .toArray((err, files) => {
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: "no files exist",
        });
      }
      res.setHeader("Content-Type", files[0].contentType);
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + files[0].filename
      );
      res.header("Content-Type", files[0].contentType);
      gfs.openDownloadStream(files[0]._id).pipe(res);
    });
});

// files/del/:id
// Delete chunks from the db
app.post("/delete/:id", (req, res) => {
  gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
    if (err)
      return res.status(404).json({
        success: false,
        err: err.message,
      });
    res.send("Success");
  });
});

app.post("/updateFileName/:id/:filename", (req, res) => {
  gfs.rename(
    mongoose.Types.ObjectId(req.params.id),
    req.params.filename,
    (err) => {
      if (err) {
        res.json({
          success: false,
          err: err,
        });
      } else
        res.json({
          success: true,
          message: "File name updated",
        });
    }
  );
});

app.listen(port, () => {
  console.log("server started on " + port);
});
