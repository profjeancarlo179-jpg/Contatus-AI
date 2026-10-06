import { createFileRoute } from "@tanstack/react-router";
import { ApprovalPanel } from "@/components/ApprovalPanel";
export const Route = createFileRoute("/a/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aprovação de arte — Contatus AI" },
      { name: "description", content: "Veja como sua arte ficará no Instagram e aprove ou peça ajustes." },
      { property: "og:title", content: "Aprovação de arte — Contatus AI" },
      { property: "og:description", content: "Veja como sua arte ficará no Instagram e aprove ou peça ajustes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Aprovar,
});

function Aprovar() {
  const { token } = Route.useParams();
  return <ApprovalPanel token={token} />;
}
