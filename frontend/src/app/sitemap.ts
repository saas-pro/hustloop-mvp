import { MetadataRoute } from 'next';
import { getPublicBlogs } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://hustloop.com';
    const currentDate = new Date();

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/pricing`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/contact-us`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/incentive-challenge`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.8,
        }
    ];

    try {
        // Fetch up to 1000 published blogs for the sitemap
        const response = await getPublicBlogs(1, 1000);
        const blogs = response?.blogs || [];

        const dynamicRoutes: MetadataRoute.Sitemap = blogs.map((blog) => ({
            url: `${baseUrl}/blog/${blog.slug}`,
            lastModified: new Date(blog.updated_at || blog.created_at || currentDate),
            changeFrequency: 'weekly',
            priority: 0.7,
        }));

        return [...staticRoutes, ...dynamicRoutes];
    } catch (error) {
        console.error("Error generating sitemap routes for blogs:", error);
        return staticRoutes;
    }
}
