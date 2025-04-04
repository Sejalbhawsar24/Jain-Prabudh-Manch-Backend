const bcrypt = require('bcrypt');
const passwordValidator = require('password-validator');

// Create password schema
const passwordSchema = new passwordValidator();
passwordSchema
  .is().min(8)
  .has().uppercase()
  .has().lowercase()
  .has().digits(1)
  .has().symbols(1)
  .has().not().spaces();

const validatePassword = (password) => {
  return passwordSchema.validate(password);
};

const getPasswordErrors = (password) => {
  return passwordSchema.validate(password, { list: true });
};

const hashPassword = async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    return next(error);
  }
};

const isPasswordMatched = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    return false;
  }
};

module.exports = {
  hashPassword,
  isPasswordMatched,
  validatePassword,
  getPasswordErrors
};