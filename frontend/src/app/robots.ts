import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/auth/*',
                    '/complete-profile/*',
                    '/verify-team-member/*',
                    '/unsubscribe-newsletter/*',
                    '/pitching-form/*',
                    '/metrics/*',
                    '/unauthorized',
                ],
            },
        ],
        sitemap: 'https://hustloop.com/sitemap.xml',
    };
}
