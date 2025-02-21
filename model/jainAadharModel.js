const mongoose = require('mongoose');

// Declare the Schema for Jain Aadhar Card
const jainAadharSchema = new mongoose.Schema(
  {
    userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
    },
    promoterId:{
      type:String
    },
    name: { type: String }, 
    pitaOrpatiName: { type: String },
    gender:{type:String},
    dob: {type: String },
    age: { type: String },
    birthPlace: { type: String },
    bloodGroup: {type: String},
    marriageStatus: { type: String },
    husbandWifeName: { type: String },
    marriageDate: { type: String },
    countSons: { type: Number },
    sonNames: [{ type: String }],
    countDaughters: { type: Number },
    daughterNames: [{ type: String }],
    mulJain: { type: String, enum: ['Digamber', 'Shwetamber'] },
    panth: {
      type:String
    },
    subCaste: { type: String, enum: ['Parwar', 'Khandelwal', 'Porwal', 'Golalare', 'Golapurab'] },
    gotra: { type: String },
    sansthan: { type: String },
    sansthanPosition: { type: String },
    pitaKaNaam: { type: String },
    pitaKaMulNiwas: { type: String },
    mataKaNaam: { type: String },
    mataKaMulNiwas: { type: String },
    dadaKaNaam: { type: String },
    dadaKaMulNiwas: { type: String },
    parDadaKaNaam: { type: String },
    parDadaKaMulNiwas: { type: String },
    brother: { type: String },
    sister: { type: String },
    mamaPaksh: {
      nanajiName: { type: String },
      mulNiwas: { type: String },
      mamaGotra: { type: String },
    },
    education: { type: String },
    job: { type: String },
    jobAddress: { type: String },
    JobPosition: {type:String},
    jobAnnualIncom : {type:String},
    business: { type: String },
    businessType: {type:String},
    businessAddress:{type: String},
    businessAnnualIncom : {type:String},
    student : {type:String},
    degree : {type:String},
    schoolName : {type:String},
    houseWife : {type:String},
    retired : {type:String},
   religionConvert: { type: String, enum: ['Yes', 'No'], default: 'No' },
   convertReason: { type: String }, 
   marriageDetails: {
    religionJati: { type: String },
    religionUpjati: { type: String },
    religionGotra: { type: String }
  },
   conversionDetails: {
    jati: { type: String },
    upjati: { type: String },
    gotra: {type:String},
    inspiration: { type: String },
    time: { type: String },
    guidance: { type: String },
 },
    contactDetails: {
      number: { type: String },
      whatsappNumber: { type: String },
      guardiansNumber: { type: String },
      guardiansRelation: { type: String },
      email: { type: String },
      address: {type: String},
      pinCode: {type:String}
    },
    PanCard: { type: String },
    AadharCard: { type: String },
    userProfile: { type: String },
   status: {
      type: String,
      enum: ['pending', 'approved'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Export the model
module.exports = mongoose.model('JainAadhar', jainAadharSchema);
