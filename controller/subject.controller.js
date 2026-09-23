require("dotenv").config();

const Subject = require("../model/subject.model");
const Exam = require("../model/examination.model");
const Period = require("../model/period.model");
module.exports = {

    getAllSubjects: async(req,res)=>{
         try {
            const schoolId = req.user.schoolId;
            const allSubject= await Subject.find({school:schoolId});
            res.status(200).json({success:true, message:"Success in fetching all  Subject", data:allSubject})
         } catch (error) {
            console.log("Error in getAllSubject", error);
            res.status(500).json({success:false, message:"Server Error in Getting All Subject. Try later"})
        }

    },
    createSubject: (req, res) => {
                        const schoolId = req.user.schoolId;
                        const newSubject = new Subject({
                            subject_name: req.body.subject_name,
                            subject_codename: req.body.subject_codename || '',
                            subject_type: req.body.subject_type || 'theory',
                            boards: Array.isArray(req.body.boards) ? req.body.boards : [],
                            optional: Boolean(req.body.optional),
                            active: req.body.active !== false,
                            school: schoolId,
                        });
                        newSubject.save().then(savedData => {
                            console.log("Date saved", savedData);
                            res.status(200).json({ success: true, data: savedData, message:"Subject is Created Successfully." })
                        }).catch(e => {
                            console.log("ERRORO in Register", e)
                            res.status(500).json({ success: false, message: "Failed Creation of Subject." })
                        })

    },
    getSubjectWithId: async(req, res)=>{
        const id = req.params.id;
        const schoolId = req.user.schoolId;
        Subject.findOne({_id:id, school:schoolId}).populate("student_class").then(resp=>{
            if(resp){
                res.status(200).json({success:true, data:resp})
            }else {
                res.status(500).json({ success: false, message: "Subject data not Available" })
            }
        }).catch(e=>{
            console.log("Error in getSubjectWithId", e)
            res.status(500).json({ success: false, message: "Error in getting  Subject Data" })
        })
    },

    updateSubjectWithId: async(req, res)=>{
    // Not providing the  schoolId as subject Id will be unique.
        try {
            let id = req.params.id;
            const updates = {};
            if (req.body.subject_name !== undefined) updates.subject_name = req.body.subject_name;
            if (req.body.subject_codename !== undefined) updates.subject_codename = req.body.subject_codename;
            if (req.body.subject_type !== undefined) updates.subject_type = req.body.subject_type;
            if (req.body.boards !== undefined) updates.boards = Array.isArray(req.body.boards) ? req.body.boards : [];
            if (req.body.optional !== undefined) updates.optional = Boolean(req.body.optional);
            if (req.body.active !== undefined) updates.active = Boolean(req.body.active);
            await Subject.findOneAndUpdate({_id:id, school:req.user.schoolId},{$set:updates},{new:true, runValidators:true});
            const SubjectAfterUpdate =await Subject.findOne({_id:id, school:req.user.schoolId});
            res.status(200).json({success:true, message:"Subject Updated", data:SubjectAfterUpdate})
        } catch (error) {
            
            console.log("Error in updateSubjectWithId", error);
            res.status(500).json({success:false, message:"Server Error in Update Subject. Try later"})
        }

    },
    deleteSubjectWithId: async(req, res)=>{
       
        try {
            const schoolId = req.user.schoolId;
            let id = req.params.id;
            const subExamCount = (await Exam.find({subject:id,school:schoolId})).length;
            const subPeriodCount = (await Period.find({subject:id,school:schoolId})).length;
            if((subExamCount===0) && (subPeriodCount===0)){
                await Subject.findOneAndDelete({_id:id,school:schoolId});
                const SubjectAfterDelete = await Subject.findOne({_id:id});
                res.status(200).json({success:true, message:"Subject Deleted.", data:SubjectAfterDelete})
            }else{
                res.status(500).json({success:false, message:"This class is already in use."})
            }

          
        } catch (error) {
            
            console.log("Error in updateSubjectWithId", error);
            res.status(500).json({success:false, message:"Server Error in Deleting Subject. Try later"})
        }

    }
}