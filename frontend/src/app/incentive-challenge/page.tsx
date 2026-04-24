import { Metadata } from 'next';
import IncentiveChallengeClient from './incentive-challenge-client';

export const metadata: Metadata = {
    title: 'Incentive Challenges - Win Prizes & Build Innovative Solutions | Hustloop',
    description: 'Join Hustloop\'s incentive challenges to solve real-world problems, win cash prizes, gain recognition, and access pilot opportunities. Open to students, innovators, startups, and professionals.',
    keywords: [
        // How people search
        'how to join innovation challenges',
        'best startup competitions to enter',
        'prize money for solving problems',
        'how to win innovation challenges',
        'where to find tech competitions',

        // Problem-solving searches
        'solve real problems for money',
        'tech challenges with cash prizes',
        'innovation competitions for students',
        'corporate hackathons near me',

        // Benefits focused
        'get funding for my startup idea',
        'win money for my innovation',
        'pitch to investors competitions',
        'startup accelerator programs',
        'grants for social entrepreneurs',

        // Specific to India
        'startup competitions in India',
        'innovation challenges for Indian students',
        'corporate hackathons India',
        'tech competitions for college students India',
        'open innovation'
    ],
    authors: [{ name: 'Hustloop' }],
    creator: 'Hustloop',
    publisher: 'Hustloop',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    openGraph: {
        title: 'Incentive Challenges - Win Prizes & Build Innovative Solutions',
        description: 'Participate in structured prize competitions where innovation meets opportunity. Win cash prizes, gain recognition, and access pilot opportunities with industry leaders.',
        url: 'https://hustloop.com/incentive-challenge',
        siteName: 'Hustloop',
        images: [
            {
                url: 'https://hustloop.com/logo.png',
                width: 1200,
                height: 630,
                alt: 'Hustloop Incentive Challenges',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Incentive Challenges - Win Prizes & Build Innovative Solutions',
        description: 'Join innovation competitions with cash prizes, pilot opportunities, and recognition. Open to students, innovators, startups, and professionals.',
        images: ['https://hustloop.com/logo.png'],
        creator: '@hustloop',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    alternates: {
        canonical: 'https://hustloop.com/incentive-challenge',
    },
};

export default function IncentiveChallengePage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebPage',
                        name: 'Incentive Challenges',
                        description: 'Join Hustloop\'s incentive challenges to solve real-world problems, win cash prizes, gain recognition, and access pilot opportunities.',
                        url: 'https://hustloop.com/incentive-challenge',
                        mainEntity: {
                            '@type': 'FAQPage',
                            mainEntity: [
                                {
                                    '@type': 'Question',
                                    name: 'Who can apply to incentive challenges?',
                                    acceptedAnswer: {
                                        '@type': 'Answer',
                                        text: 'Anyone with an innovative solution can apply! This includes students, researchers, innovators, early-stage founders, organisation, professionals, and technology enthusiasts.'
                                    }
                                },
                                {
                                    '@type': 'Question',
                                    name: 'What do I need to submit?',
                                    acceptedAnswer: {
                                        '@type': 'Answer',
                                        text: 'You need to submit a pitch deck, prototype or demo (if applicable), and supporting documents such as technical specifications or research papers.'
                                    }
                                },
                                {
                                    '@type': 'Question',
                                    name: 'What is the allowed team size?',
                                    acceptedAnswer: {
                                        '@type': 'Answer',
                                        text: 'Both individual participants and teams are welcome! Team size typically ranges from 1 to 5 members, though specific challenges may have different requirements.'
                                    }
                                },
                                {
                                    '@type': 'Question',
                                    name: 'Who owns the intellectual property?',
                                    acceptedAnswer: {
                                        '@type': 'Answer',
                                        text: 'You retain full ownership of your intellectual property. All submissions, ideas, prototypes, and related materials remain the property of the participants.'
                                    }
                                },
                                {
                                    '@type': 'Question',
                                    name: 'What happens after winning?',
                                    acceptedAnswer: {
                                        '@type': 'Answer',
                                        text: 'Winners gain access to pilot projects, partnerships with corporates and organisation, visibility through Hall of Fame and media coverage, networking opportunities, continued mentorship, and recognition through certificates and awards.'
                                    }
                                }
                            ]
                        },
                        breadcrumb: {
                            '@type': 'BreadcrumbList',
                            itemListElement: [
                                {
                                    '@type': 'ListItem',
                                    position: 1,
                                    name: 'Home',
                                    item: 'https://hustloop.com'
                                },
                                {
                                    '@type': 'ListItem',
                                    position: 2,
                                    name: 'Incentive Challenges',
                                    item: 'https://hustloop.com/incentive-challenge'
                                }
                            ]
                        }
                    })
                }}
            />
            <IncentiveChallengeClient />
        </>
    );
}
