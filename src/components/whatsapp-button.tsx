import { Icon } from "@/components/icons";
import { whatsappLink } from "@/core/whatsapp";

/** Opens WhatsApp with the message written; without a number WhatsApp asks which chat to use. */
export function WhatsappButton({ phone, text, children = "Avisar por WhatsApp", className = "btn-ghost btn-sm" }: { phone?: string; text: string; children?: React.ReactNode; className?: string }) {
  return (
    <a href={whatsappLink(phone, text)} target="_blank" rel="noopener noreferrer" className={className}>
      <Icon name="chat" className="h-3.5 w-3.5" />
      {children}
    </a>
  );
}
