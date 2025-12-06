// Error handling wrapper for API calls
export const handleApiError = (error, defaultMessage = "Une erreur est survenue") => {
    if (error.response) {
        // Server responded with error status
        const message = error.response.data?.message || error.response.data || defaultMessage;
        return typeof message === 'string' ? message : defaultMessage;
    } else if (error.request) {
        // Request made but no response
        return "Erreur de connexion au serveur. Vérifiez votre connexion internet.";
    } else {
        // Something else happened
        return error.message || defaultMessage;
    }
};

// Phone validation (Algerian format: 0X XX XX XX XX)
export const validatePhone = (phone) => {
    const phoneRegex = /^0[5-7]\d{8}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    return ph oneRegex.test(cleanPhone);
};

// Email validation
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Required field validation
export const validateRequired = (value) => {
    return value !== null && value !== undefined && value.toString().trim() !== '';
};

// Date validation (not too far in future)
export const validateDate = (dateString, maxFutureDays = 365) => {
    const date = new Date(dateString);
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxFutureDays);

    return date >= now && date <= maxDate;
};

// Format phone for display
export const formatPhone = (phone) => {
    const clean = phone.replace(/\s/g, '');
    if (clean.length === 10) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)} ${clean.slice(8)}`;
    }
    return phone;
};

// Validation helper for forms
export const validateForm = (data, rules) => {
    const errors = {};

    Object.keys(rules).forEach(field => {
        const rule = rules[field];
        const value = data[field];

        if (rule.required && !validateRequired(value)) {
            errors[field] = `${rule.label || field} est obligatoire`;
        } else if (rule.email && value && !validateEmail(value)) {
            errors[field] = "Format d'email invalide";
        } else if (rule.phone && value && !validatePhone(value)) {
            errors[field] = "Format de téléphone invalide (ex: 0655443322)";
        } else if (rule.min && value && value.length < rule.min) {
            errors[field] = `${rule.label || field} doit contenir au moins ${rule.min} caractères`;
        }
    });

    return errors;
};
