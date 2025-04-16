"use client";

import { Button } from "@/components/ui/button";
import { PencilIcon, ListChecks } from "lucide-react";
import { CriteriaList } from "@/lib/types";

interface CriteriaSidebarProps {
  criteria: CriteriaList;
  onEditCriteria: () => void;
}

export function CriteriaSidebar({ criteria, onEditCriteria }: CriteriaSidebarProps) {
  return (
    <div className="space-y-5">
      <h3 className="font-medium text-base flex items-center gap-2 px-2">
        <ListChecks className="h-4 w-4 text-primary" /> Screening Criteria
      </h3>
      
      {criteria.filter(c => c.type === 'inclusion').length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm mb-1 text-green-700 px-2">Inclusion Criteria</h4>
          <div className="bg-muted/30 rounded-md py-3 px-2">
            <ul className="list-disc pl-6 pr-2 space-y-3 text-sm">
              {criteria
                .filter(c => c.type === 'inclusion')
                .map(c => (
                  <li key={c.id} className="text-foreground">{c.text}</li>
                ))}
            </ul>
          </div>
        </div>
      )}
      
      {criteria.filter(c => c.type === 'exclusion').length > 0 && (
        <div className="space-y-2 mt-6">
          <h4 className="font-medium text-sm mb-1 text-red-700 px-2">Exclusion Criteria</h4>
          <div className="bg-muted/30 rounded-md py-3 px-2">
            <ul className="list-disc pl-6 pr-2 space-y-3 text-sm">
              {criteria
                .filter(c => c.type === 'exclusion')
                .map(c => (
                  <li key={c.id} className="text-foreground">{c.text}</li>
                ))}
            </ul>
          </div>
        </div>
      )}
      
      {criteria.length === 0 && (
        <div className="bg-muted/30 rounded-md p-4 text-sm text-muted-foreground">
          <p>No criteria defined yet.</p>
        </div>
      )}
      
      <div className="px-2 pt-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onEditCriteria}
        >
          <PencilIcon className="h-3 w-3 mr-2" />
          Edit Criteria
        </Button>
      </div>
    </div>
  );
} 