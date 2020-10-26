const { validationResult } = require('express-validator');

class DomainError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class InternalError extends DomainError {
    constructor(error) {
        super(error.message);
        this.data = { error };
    }
}

class ValidationError extends Error {
    constructor(errors) {
        super('Validation Error');
        this.errors = errors;
    }
}

const requestValidationHandler = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError(errors.array());
    }
    else
    {
        next();
    }    
}

const validationErrorHandler = (err, req, res, next) => {
    if (err instanceof ValidationError) {
        res.status(400).json({ Result: 'Validation Error', ValidationMessages: err.errors });
    }
    else {
        next(err);
    }
}

const internalErrorHandler = (err, req, res, next) => {
    if (err instanceof InternalError) {
        console.log(err);
        res.status(500).json({ Result: 'Internal Error' });
    }
    else {
        next(err);
    }
}


module.exports = {
    InternalError,
    ValidationError,
    internalErrorHandler,
    validationErrorHandler,
    requestValidationHandler
}