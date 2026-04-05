import dns from 'dns/promises';

const EMAIL_FORMAT_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export const normalizeEmail = (value?: string) => value?.trim().toLowerCase() || '';

const hasValidEmailFormat = (email: string) => {
    if (!EMAIL_FORMAT_REGEX.test(email) || email.length > 254) {
        return false;
    }

    const [localPart, domain] = email.split('@');

    if (!localPart || !domain) {
        return false;
    }

    if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
        return false;
    }

    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
        return false;
    }

    return domainParts.every((part) => (
        !!part
        && !part.startsWith('-')
        && !part.endsWith('-')
        && !part.includes('..')
    ));
};

const hasResolvableEmailDomain = async (domain: string) => {
    try {
        const mxRecords = await dns.resolveMx(domain);
        if (mxRecords.length > 0) {
            return true;
        }
    } catch {
        // Fall through to A/AAAA lookups. Some providers accept mail on the root domain.
    }

    const [ipv4Result, ipv6Result] = await Promise.allSettled([
        dns.resolve4(domain),
        dns.resolve6(domain),
    ]);

    return (
        (ipv4Result.status === 'fulfilled' && ipv4Result.value.length > 0)
        || (ipv6Result.status === 'fulfilled' && ipv6Result.value.length > 0)
    );
};

export const validateEmailAddress = async (value?: string) => {
    const email = normalizeEmail(value);

    if (!email) {
        return {
            email,
            isValid: false,
            message: 'Email address is required.',
        };
    }

    if (!hasValidEmailFormat(email)) {
        return {
            email,
            isValid: false,
            message: 'Enter a valid email address like name@example.com.',
        };
    }

    const [, domain] = email.split('@');
    const domainExists = await hasResolvableEmailDomain(domain);

    if (!domainExists) {
        return {
            email,
            isValid: false,
            message: 'This email domain could not be found. Please check the address and try again.',
        };
    }

    return {
        email,
        isValid: true,
        message: '',
    };
};
