import mongoose from "mongoose";
const schema=new mongoose.Schema({requestId:{type:String,required:true,unique:true,index:true},participantId:{type:mongoose.Schema.Types.ObjectId,ref:"Participant",required:true}},{timestamps:true});
export default mongoose.model("RegistrationRequest",schema);
