"use client";

import { Button } from "@/components/ui/button";
import { PencilIcon, ListChecks, MenuIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CriteriaList } from "@/lib/types";

interface CriteriaSidebarMobileProps {
  criteria: CriteriaList;
  onEditCriteria: () => void;
}

export function CriteriaSidebarMobile({ criteria, onEditCriteria }: CriteriaSidebarMobileProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="w-full flex items-center justify-between">
          <div className="flex items-center">
            <ListChecks className="h-4 w-4 mr-2 text-primary" />
            <span>View Screening Criteria</span>
          </div>
          <MenuIcon className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-md pt-6">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> 
            Screening Criteria
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-5">
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
              onClick={() => {
                onEditCriteria();
                document.querySelector('.SheetClose')?.dispatchEvent(new Event('click', { bubbles: true }));
              }}
            >
              <PencilIcon className="h-3 w-3 mr-2" />
              Edit Criteria
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 