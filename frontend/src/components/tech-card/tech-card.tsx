// SecureCard.tsx
import Image from "next/image";

interface SecureCardProps {
    title: string;
    author: string;
    icon?: string;
}

export default function TechCard({ title, author, icon = "/bluetick.png" }: SecureCardProps) {
    return (
        <div className="container-card w-fit">
            <div className="main-container hover:scale-110 transition-all duration-30">
                <div className="verified-symbol">
                    <Image src={icon} alt="icon" width={22} height={22} />
                </div>

                <div className="inverted ">
                    <div className="inverted-text max-w-[320px]">
                        <h2 className="truncate font-epic">{title}</h2>
                    </div>
                </div>

                <div className="author-name max-w-[100px]">
                    <p className="truncate font-sans">{author}</p>
                </div>
            </div>
        </div>
    );
}
