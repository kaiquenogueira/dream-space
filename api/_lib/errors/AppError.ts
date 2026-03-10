export class AppError extends Error {
    public statusCode: number;
    public payload?: any;

    constructor(message: string, statusCode: number = 500, payload?: any) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.payload = payload;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Não autorizado', payload?: any) {
        super(message, 401, payload);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Acesso proibido', payload?: any) {
        super(message, 403, payload);
        this.name = 'ForbiddenError';
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = 'Requisicão inválida', payload?: any) {
        super(message, 400, payload);
        this.name = 'BadRequestError';
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Muitas requisições. Tente novamente em instantes.', payload?: any) {
        super(message, 429, payload);
        this.name = 'RateLimitError';
    }
}
