import { SiteLayout } from "../ui/Layout";

export default function Terms() {
  return (
    <SiteLayout title="Terms of Use" lede={<p className="updated mono">Last updated October 7, 2026</p>}>
      <div className="prose">
        <p>These terms apply to this website. By using it, you agree to them.</p>

        <h2 className="mono">The website</h2>
        <p>The content on this site is provided for general information. We may change or remove it at any time without notice.</p>

        <h2 className="mono">Models</h2>
        <p>Models, weights, code, and datasets published by Quaedra Research are governed by the license distributed with each release. Where a release license conflicts with these terms, the release license applies.</p>

        <h2 className="mono">Acceptable use</h2>
        <p>Do not use this site or our models to break the law, infringe the rights of others, or interfere with the operation of our services.</p>

        <h2 className="mono">No warranty</h2>
        <p>This site and its content are provided “as is”, without warranties of any kind. Model outputs can be inaccurate, and you are responsible for how you use them.</p>

        <h2 className="mono">Limitation of liability</h2>
        <p>To the extent permitted by law, Quaedra Research is not liable for any damages arising from your use of this site or its content.</p>

        <h2 className="mono">Changes</h2>
        <p>We may update these terms. The date at the top shows when they last changed.</p>

        <h2 className="mono">Contact</h2>
        <p>Questions about these terms: <a href="mailto:hello@quaedra.com">hello@quaedra.com</a></p>
      </div>
    </SiteLayout>
  );
}
