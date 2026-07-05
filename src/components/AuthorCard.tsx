import { Globe, Twitter, Instagram, Facebook, Youtube, Linkedin, Music2 } from "lucide-react";

export type Author = {
  id: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  website_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  tiktok_url: string | null;
};

const SOCIALS: { key: keyof Author; label: string; Icon: any }[] = [
  { key: "website_url", label: "Website", Icon: Globe },
  { key: "twitter_url", label: "Twitter / X", Icon: Twitter },
  { key: "instagram_url", label: "Instagram", Icon: Instagram },
  { key: "facebook_url", label: "Facebook", Icon: Facebook },
  { key: "youtube_url", label: "YouTube", Icon: Youtube },
  { key: "linkedin_url", label: "LinkedIn", Icon: Linkedin },
  { key: "tiktok_url", label: "TikTok", Icon: Music2 },
];

export function AuthorCard({ author, className }: { author: Author; className?: string }) {
  const links = SOCIALS.filter((s) => (author as any)[s.key]);

  return (
    <div
      className={[
        "rounded-2xl border border-border bg-card p-5 md:p-6",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        {author.avatar_url ? (
          <img
            src={author.avatar_url}
            alt={author.name}
            className="h-16 w-16 shrink-0 rounded-full object-cover md:h-20 md:w-20"
          />
        ) : (
          <div className="h-16 w-16 shrink-0 rounded-full bg-muted md:h-20 md:w-20" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Written by
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">{author.name}</div>
          {author.bio && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {author.bio}
            </p>
          )}
          {links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {links.map(({ key, label, Icon }) => (
                <a
                  key={key as string}
                  href={(author as any)[key] as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${author.name} on ${label}`}
                  title={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
