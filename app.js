const express = require("express");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require('multer');
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const { read } = require("fs");
require("dotenv").config();


const app = express();

//middleware
app.use(express.json());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");

//Mongo URI
const MONGO_URI = process.env.MONGO_URI;

// Create mongo connection
const conn = mongoose.createConnection(MONGO_URI);

// Init gfs
let gfs;

conn.once("open", () => {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection("uploads");

});

// Create storage engine
const storage = new GridFsStorage({
    url: MONGO_URI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });


// @route GET /
// @desc Load form
app.get("/", (req, res) => {
    
    
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if(!files || files.length === 0){

            res.render("index",{files: false});
        } else {
            files.map(file => {

                if(file.contentType === "image/jpeg" || file.contentType === "image/png") {
                    file.isImage = true;

                } else {
                    file.isImage = false;
                }
            });
            res.render("index",{files: files});
        }
    })
})

// @route POST /upload
// @desc upload file into db
app.post("/upload", upload.single("file") , (req, res) => {

    // res.json({file: req.file});
    res.redirect("/");
});

// @route DELETE /files/:_id
// @desc delte file from db
app.delete("/files/:id" , (req, res) => {

    gfs.remove({_id: req.params.id, root: "uploads"}, (err, gridStore) => {
        if(err) {
            res.status(404).json({err: "There is no such file exists."}); 
        } else {

            res.redirect("/");
        }
    });
})


// @route GET /files
// @desc Display all files in JSON
app.get("/files", (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if(!files || files.length === 0){

             res.status(404).json({
                err: "No files exist"
            })
        } 
        //Files exist
        else {
            res.json(files); 
        }
    })

});

// @route GET /files/:fileName
// @desc Display one file in JSON
app.get("/files/:filename", (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        // Check if files
        if(!file || file.length === 0){

            res.status(404).json({
               err: "No file exists"
           })
       } 
       //Files exist
       else {
           res.json(file); 
       }
    });

});


// @route GET /images/:filename
// @desc Display one image
app.get("/images/:filename", (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        // Check if files
        if(!file || file.length === 0){

            res.status(404).json({
               err: "No file exists"
           })
       } 
       //check if image
       if (file.contentType === "image/jpeg" || file.contentType === "image/png"){
           //Read output to browser
           const readstream = gfs.createReadStream(file.filename);
           readstream.pipe(res);
       } else {
           res.status(404).json({
               err: "invalid image"
           })
       }
       
    });

});

app.listen(5000, () => console.log("Server is listening on port 5000...."));