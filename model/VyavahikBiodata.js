const mongoose = require('mongoose');

const vyavahikBiodataSchema = new mongoose.Schema(
  {
    type: {
      type: String,
    },
    remarrigeDetails: {
      marriageType: {
        type: String,
      },
      hasChildren: {
        type: String,
        enum: ['Yes', 'No'],
      },
      countChild: {
        type: Number,
      },
      childrenDetails: [
        {
          name: {
            type: String,
          },
          age: {
            type: Number,
          },
        },
      ],
      divorceDetails: {
        legalDivorceReceived: {
          type: String,
          enum: ['Yes', 'No'],
        },
        legalDocument: {
          type: String, 
        },
        previousMarriageDetails: {
          spouseName: {
            type: String,
          },
          marriageDate: {
            type: Date,
          },
          marriageBreakDate: {
            type: Date,
          },
          spouseFatherName: {
            type: String,
          },
          spouseMotherName: {
            type: String,
          },
        },
      },
      widowDetails: {
        causeOfDeath: {
          type: String,
        },
        deathDate: {
          type: Date,
        },
        divorcePreviousDetail: {
          spouseName: {
            type: String,
          },
          marriageDate: {
            type: Date,
          },
          spouseFatherName: {
            type: String,
          },
          spouseMotherName: {
            type: String,
          },
        },
      },
    },
    jainAadhar: {
      type: String,
    },
    passportPhoto: {
      type: String,
    },
    fullPhoto: {
      type: String,
    },
    familyPhoto: {
      type: String,
    },
    name: {
      type: String,
    },
    gender: {
      type: String,
    },
    mobileNumber: {
      type: String,
    },
    age: {
      type: Number,
    },
    dob: {
      type: Date,
    },
    dobTime: {
      type: String,
    },
    dobPlace: {
      type: String,
    },
    weight: {
      type: Number,
    },
    height: {
      type: Number,
    },
    bloodGroup: {
      type: String,
    },
    mulJain: {
      type: String,
    },
    panth: {
      type: String,
    },
    upJati: {
      type: String,
    },
    rang: {
      type: String,
    },
    education: {
      type: String,
    },
    occupationType: {
      type: String, // 'job' or 'business'
    },
    job: {
      jobName: {
        type: String,
      },
      jobAddress: {
        type: String,
      },
      annualIncome: {
        type: String,
      },
    },
    business: {
      businessType: {
        type: String,
      },
      businessName: {
        type: String,
      },
      businessAddress: {
        type: String,
      },
      annualIncome: {
        type: String,
      },
    },
    gotra: {
      type: String,
    },
    mamaGotra: {
      type: String,
    },
    pariwarInfo: {
      fatherName: {
        type: String,
      },
      fatherOccupation: {
        type: String,
      },
      motherName: {
        type: String,
      },
      motherOccupation: {
        type: String,
      },
      brotherName: {
        type: String,
      },
      brotherOccupation: {
        type: String,
      },
      sisterName: {
        type: String,
      },
      sisterOccupation: {
        type: String,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VyavahikBiodata', vyavahikBiodataSchema);
