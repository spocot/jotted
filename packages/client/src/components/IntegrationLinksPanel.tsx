import { useState } from "react";
import { useGetIntegrationLinksQuery } from "../store/redux/api";
import IntegrationLinkBadge from "./IntegrationLinkBadge";
import IntegrationLinkModal from "./IntegrationLinkModal";

interface IntegrationLinksPanelProps {
  entityType: string;
  entityId: string;
}

export default function IntegrationLinksPanel({
  entityType,
  entityId,
}: IntegrationLinksPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const { data: links, isLoading } = useGetIntegrationLinksQuery(
    { entityType, entityId },
    { skip: !entityId },
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Linked Resources
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Link
        </button>
      </div>

      {isLoading && (
        <div className="flex gap-1">
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      )}

      {!isLoading && links && links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {links.map((link) => (
            <IntegrationLinkBadge key={link.id} link={link} />
          ))}
        </div>
      )}

      {!isLoading && (!links || links.length === 0) && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          No linked resources
        </p>
      )}

      {showModal && (
        <IntegrationLinkModal
          open={showModal}
          onClose={() => setShowModal(false)}
          entityType={entityType}
          entityId={entityId}
          onLinkCreated={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
