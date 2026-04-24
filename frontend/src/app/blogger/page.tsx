import BloggerClient from "./blogger-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Blogger Workspace",
    description: "Manage your blog posts on Hustloop.",
};

export default function BloggerPage() {
    return <BloggerClient />;
}
