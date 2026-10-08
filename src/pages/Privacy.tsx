import { SiteLayout } from "../ui/Layout";

export default function Privacy() {
  return (
    <SiteLayout title="Privacy Policy" lede={<p className="updated mono">Last updated October 7, 2026</p>}>
      <div className="prose">
        <p>This site is a static page. We do not run analytics, set cookies, or ask you for personal information.</p>

        <h2 className="mono">What is collected</h2>
        <ul>
          <li><strong>Hosting logs.</strong> Our hosting provider may record standard request data such as IP address, browser, and time of visit, for security and operations.</li>
          <li><strong>Fonts.</strong> Fonts are loaded from Google Fonts, which receives your IP address when the page loads. See <a href="https://policies.google.com/privacy">Google’s privacy policy</a>.</li>
          <li><strong>Model demos.</strong> The Nodd demo downloads its runtime from jsDelivr and model files from Hugging Face, which receive your IP address. Text you type into the demo is processed in your browser and is not sent anywhere.</li>
          <li><strong>Email.</strong> If you write to us, we keep your message and address to reply.</li>
        </ul>

        <h2 className="mono">How it is used</h2>
        <p>Only to operate the site and respond to you. We do not sell or share personal data for advertising.</p>

        <h2 className="mono">Your rights</h2>
        <p>You can ask us to access or delete any personal data we hold about you by emailing <a href="mailto:hello@quaedra.com">hello@quaedra.com</a>.</p>

        <h2 className="mono">Changes</h2>
        <p>We may update this policy. The date at the top shows when it last changed.</p>
      </div>
    </SiteLayout>
  );
}
