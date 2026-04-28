const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema({
    school_name:{type:String, required:true},
    email:{ type: String,  required:true },
    owner_name:{type:String, required:true},
    school_image:{type:String,  required:true},
    address:{type:String, default:''},
    city:{type:String, default:''},
    state:{type:String, default:''},
    pincode:{type:String, default:''},
    phone:{type:String, default:''},
    createdAt:{type:Date, default: new Date()},

    password:{type:String, required:true}

})

module.exports = mongoose.model("School", schoolSchema)