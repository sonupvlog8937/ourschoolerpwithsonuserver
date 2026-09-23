const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
    school:{type:mongoose.Schema.ObjectId, ref:'School'},
    subject_name:{type:String, required:true},
    subject_codename:{type:String, default:''},
    subject_type:{type:String, enum:['theory', 'practical'], default:'theory'},
    boards:{type:[String], default:[]},
    optional:{type:Boolean, default:false},
    active:{type:Boolean, default:true},
    createdAt:{type:Date, default:new Date()}

})

module.exports = mongoose.model("Subject", subjectSchema)