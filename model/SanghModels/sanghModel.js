// server/model/SanghModels/sanghModel.js
const mongoose = require('mongoose');

const officeBearerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  name: {
    type: String,
  },
  jainAadharNumber: {
    type: String,
    required: true
  },
  photo: {
    type: String,
    required: true
  },
  document: {
    type: String,
    required: true
  }
});

const memberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  jainAadharNumber: {
    type: String,
    required: true
  },
  email: String,
  phoneNumber: String,
  address: {
    street: String,
    city: String,
    district: String,
    state: String,
    pincode: String
  }
});

const sanghSchema = new mongoose.Schema({
  sanghId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Sangh name is required'],
    trim: true
  },
  level: {
    type: String,
    enum: ['city', 'district', 'state', 'country'],
    required: true
  },
  location: {
    city: String,
    district: String,
    state: String
  },
  officeBearers: {
    president: officeBearerSchema,
    secretary: officeBearerSchema,
    treasurer: officeBearerSchema
  },
  members: {
    type: [memberSchema],
    validate: {
      validator: function(members) {
        return this.level !== 'city' || members.length >= 3;
      },
      message: 'City Sangh must have at least 3 members'
    }
  },
  parentSangh: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sangh'
  },
  constituentSanghs: [{
    type: String,
    required: function() {
      return ['district', 'state', 'country'].includes(this.level);
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Generate Sangh ID
sanghSchema.pre('save', async function(next) {
  if (this.isNew && !this.sanghId) {
    try {
      const prefix = {
        city: 'CITY',
        district: 'DIST',
        state: 'STATE',
        country: 'CTRY'
      }[this.level];

      const locationCode = this.location.city?.substring(0, 3).toUpperCase() || 
                         this.location.district?.substring(0, 3).toUpperCase() ||
                         this.location.state?.substring(0, 3).toUpperCase();
      
      const year = new Date().getFullYear().toString().slice(-2);
      const count = await this.constructor.countDocuments({
        level: this.level,
        'location.city': this.location.city
      });
      
      this.sanghId = `${prefix}-${locationCode}-${year}-${String(count + 1).padStart(3, '0')}`;
    } catch (error) {
      next(error);
    }
  }
  next();
});

// Update the validation for constituent Sanghs to use sanghId
sanghSchema.pre('save', async function(next) {
  if (this.isModified('constituentSanghs')) {
    const minRequired = {
      district: 2,
      state: 2,
      country: 2
    };

    if (['district', 'state', 'country'].includes(this.level)) {
      if (!this.constituentSanghs || !Array.isArray(this.constituentSanghs)) {
        throw new Error(`${this.level} level Sangh requires constituent Sanghs array`);
      }

      const validSanghIds = this.constituentSanghs.filter(id => id && typeof id === 'string');
      if (validSanghIds.length < minRequired[this.level]) {
        throw new Error(`${this.level} level Sangh requires at least ${minRequired[this.level]} constituent Sanghs`);
      }

      // Verify constituent Sanghs are of correct level and exist
      const expectedLevel = {
        district: 'city',
        state: 'district',
        country: 'state'
      };

      const constituentSanghs = await mongoose.model('Sangh').find({
        sanghId: { $in: validSanghIds },
        status: 'active'
      });

      if (constituentSanghs.length !== validSanghIds.length) {
        const foundIds = constituentSanghs.map(s => s.sanghId);
        const missingIds = validSanghIds.filter(id => !foundIds.includes(id));
        throw new Error(`Invalid or inactive constituent Sangh IDs: ${missingIds.join(', ')}`);
      }

      // Check if any of the constituent Sanghs are already part of another Sangh
      for (const sangh of constituentSanghs) {
        const existingParent = await mongoose.model('Sangh').findOne({
          _id: { $ne: this._id },
          constituentSanghs: sangh.sanghId,
          status: 'active'
        });

        if (existingParent) {
          throw new Error(`Sangh ${sangh.sanghId} is already part of ${existingParent.name} (${existingParent.sanghId})`);
        }

        // Verify level matches
        if (sangh.level !== expectedLevel[this.level]) {
          throw new Error(`${this.level} level Sangh can only be formed from ${expectedLevel[this.level]} level Sanghs. ${sangh.sanghId} is a ${sangh.level} level Sangh.`);
        }
      }

      // Verify all constituent Sanghs are from the same region
      if (this.level === 'district') {
        const districts = [...new Set(constituentSanghs.map(s => s.location.district))];
        if (districts.length !== 1) {
          throw new Error('All constituent Sanghs must be from the same district');
        }
      } else if (this.level === 'state') {
        const states = [...new Set(constituentSanghs.map(s => s.location.state))];
        if (states.length !== 1) {
          throw new Error('All constituent Sanghs must be from the same state');
        }
      }
    }
  }
  next();
});

// Add validation for removing members
sanghSchema.pre('save', function(next) {
  if (this.isModified('members') && this.level === 'city' && this.members.length < 3) {
    next(new Error('City Sangh must maintain at least 3 members'));
  }
  next();
});

// Add method to check if user can be removed
sanghSchema.methods.canRemoveMember = function() {
  return this.members.length > 3;
};

// Add method to check if tenure is ending soon
sanghSchema.methods.checkTenureStatus = function() {
  const today = new Date();
  const warningPeriod = 30; // Days before tenure ends to start warning
  
  const presidentEndDate = new Date(this.officeBearers.president.endDate);
  const secretaryEndDate = new Date(this.officeBearers.secretary.endDate);
  const treasurerEndDate = new Date(this.officeBearers.treasurer.endDate);
  
  const endingPositions = [];
  
  if ((presidentEndDate - today) / (24 * 60 * 60 * 1000) <= warningPeriod) {
    endingPositions.push('president');
  }
  if ((secretaryEndDate - today) / (24 * 60 * 60 * 1000) <= warningPeriod) {
    endingPositions.push('secretary');
  }
  if ((treasurerEndDate - today) / (24 * 60 * 60 * 1000) <= warningPeriod) {
    endingPositions.push('treasurer');
  }
  
  return {
    hasEndingTenures: endingPositions.length > 0,
    endingPositions,
    daysRemaining: Math.min(
      Math.ceil((presidentEndDate - today) / (24 * 60 * 60 * 1000)),
      Math.ceil((secretaryEndDate - today) / (24 * 60 * 60 * 1000)),
      Math.ceil((treasurerEndDate - today) / (24 * 60 * 60 * 1000))
    )
  };
};

// Add indexes
sanghSchema.index({ level: 1 });
sanghSchema.index({ 'location.city': 1 });
sanghSchema.index({ 'location.district': 1 });
sanghSchema.index({ 'location.state': 1 });
sanghSchema.index({ parentSangh: 1 });
sanghSchema.index({ sanghId: 1 }, { unique: true });

module.exports = mongoose.model('Sangh', sanghSchema);