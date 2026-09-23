const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema({
    school_name:{type:String, required:true},
    email:{ type: String,  required:true },
    owner_name:{type:String, required:true},
    school_image:{type:String,  required:true},
    address:{type:String, default:''},
    shortName:{type:String, default:''},
    affiliationNo:{type:String, default:''},
    registrationNo:{type:String, default:''},
    officeNo:{type:String, default:''},
    helpNo:{type:String, default:''},
    websiteAddress:{type:String, default:''},
    facebookLink:{type:String, default:''},
    instagramLink:{type:String, default:''},
    twitterLink:{type:String, default:''},
    youtubeLink:{type:String, default:''},
    registrationDescription:{type:String, default:''},
    apiBiometric:{type:String, default:''},
    apiBiometricKey:{type:String, default:''},
    apiBiometricSecret:{type:String, default:''},
    saturdayWorking:{type:Boolean, default:false},
    sundayWorking:{type:Boolean, default:false},
    principalSignature:{type:String, default:''},
    dashboardBackground:{type:String, default:''},
    boardLogo:{type:String, default:''},
    welcomeCard:{type:String, default:''},
    city:{type:String, default:''},
    state:{type:String, default:''},
    pincode:{type:String, default:''},
    phone:{type:String, default:''},
    status:{type:String, enum:['pending', 'active', 'rejected'], default:'pending'},
    rejectionReason:{type:String, default:''},
    approvedAt:{type:Date, default:null},
    approvedBy:{type:mongoose.Schema.Types.ObjectId, ref:'SuperAdmin', default:null},
    createdAt:{type:Date, default: new Date()},

    password:{type:String, required:true}

})

module.exports = mongoose.model("School", schoolSchema)