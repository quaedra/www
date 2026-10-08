import { SiteLayout } from "../ui/Layout";

export default function Contact() {
  return (
    <SiteLayout title="Contact" lede={<p className="lede">Research collaborations, model access, press, or anything else.</p>}>
      <div className="prose">
        <h2 className="mono">Email</h2>
        <p><a href="mailto:hello@quaedra.com">hello@quaedra.com</a></p>

        <h2 className="mono">GitHub</h2>
        <p><a href="https://github.com/quaedra">github.com/quaedra</a></p>

        <h2 className="mono">Hugging Face</h2>
        <p><a href="https://huggingface.co/quaedra">huggingface.co/quaedra</a></p>
      </div>
    </SiteLayout>
  );
}
