import { PageHeader, TextLink } from "../components/ui.jsx";

const CONTACT_EMAIL = "westernislamicrelief@gmail.com";

function Section({ title, children }) {
  return (
    <section className="border-t border-ink-200 pt-6">
      <h2 className="font-display text-2xl font-medium text-ink-900">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-600">{children}</div>
    </section>
  );
}

// Plain-language summary of what the app actually stores and shows. Keep it in step with the
// code: if a new field is collected or made visible to others, update this page.
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        eyebrow="Changemakers"
        title="Privacy policy"
        subtitle="What Western Islamic Relief Canada's Changemakers app collects, who can see it, and how to have it removed. Last updated October 8, 2026."
      />

      <div className="space-y-8">
        <Section title="What we collect">
          <p>When you sign up, we store:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Your name, email address, year, program, cause and fundraising link.</li>
            <li>Whether you chose to appear as Anonymous.</li>
            <li>Your password, stored only as a one-way hash. Nobody, including us, can read it.</li>
            <li>The team you're placed in, and the donation amount you log each week.</li>
          </ul>
          <p>
            We never handle payments or card details. Donations are made on Islamic Relief
            Canada's own fundraising pages; this app only records the amounts you enter.
          </p>
        </Section>

        <Section title="Who can see it">
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong className="text-ink-800">Anyone:</strong> the public leaderboard shows
              team names and team rankings only, never individual members.
            </li>
            <li>
              <strong className="text-ink-800">Logged-in members:</strong> your name, year,
              program, cause, fundraising link, team and streak. If you chose Anonymous, they see
              "Anonymous" and your team and streak only.
            </li>
            <li>
              <strong className="text-ink-800">Your dollar amounts:</strong> only you, your team's
              VP and the Changemakers overall admin.
            </li>
          </ul>
        </Section>

        <Section title="How we use it">
          <p>
            Only to run Changemakers: placing you on a team, ranking teams on the leaderboard,
            and showing your progress. We email you only for your welcome message and password
            resets.
          </p>
          <p>
            The site uses a single cookie to keep you logged in. There is no advertising or
            tracking.
          </p>
        </Section>

        <Section title="Sharing">
          <p>
            We don't sell or share your information. It is stored and delivered by the services
            that run the app: Vercel and Render (hosting), Neon (database) and Google (sending
            email).
          </p>
        </Section>

        <Section title="Deleting your account">
          <p>
            Email <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink> from the
            address you signed up with and we'll delete your account and your logged donations.
            Questions about this policy go to the same address.
          </p>
        </Section>
      </div>
    </div>
  );
}
