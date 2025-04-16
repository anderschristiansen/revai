"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { PlusIcon, XIcon, PencilIcon } from "lucide-react";
import { updateSessionCriteria } from "@/lib/utils/supabase-utils";
import type { CriteriaList } from "@/lib/types";

interface CriteriaFormProps {
  sessionId: string;
  criteria: CriteriaList;
  onCriteriaUpdated?: (newCriteria: CriteriaList) => void;
}

export function CriteriaForm({ sessionId, criteria, onCriteriaUpdated }: CriteriaFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCriteria, setEditedCriteria] = useState<CriteriaList>(criteria);
  const [isSaving, setIsSaving] = useState(false);

  // Add a function to add new criteria
  const addCriterion = (type: 'inclusion' | 'exclusion') => {
    setEditedCriteria(prev => [
      ...prev,
      { id: crypto.randomUUID(), text: "", type }
    ]);
  };

  // Add a function to remove criteria
  const removeCriterion = (id: string) => {
    setEditedCriteria(prev => prev.filter(c => c.id !== id));
  };

  // Add a function to update criteria text
  const updateCriterionText = (id: string, text: string) => {
    setEditedCriteria(prev => 
      prev.map(c => c.id === id ? { ...c, text } : c)
    );
  };

  // Add a function to update criteria type
  const updateCriterionType = (id: string, type: 'inclusion' | 'exclusion') => {
    setEditedCriteria(prev => 
      prev.map(c => c.id === id ? { ...c, type } : c)
    );
  };

  // Add a function to save criteria
  const saveCriteria = async () => {
    // Check that all criteria have text
    if (editedCriteria.some(c => !c.text.trim())) {
      toast.error("All criteria must have text");
      return;
    }
    
    // Ensure at least one criterion exists (either inclusion or exclusion)
    if (editedCriteria.length === 0) {
      toast.error("You must provide at least one criterion (inclusion or exclusion)");
      return;
    }

    try {
      setIsSaving(true);
      
      await updateSessionCriteria(sessionId, editedCriteria);
      
      if (onCriteriaUpdated) {
        onCriteriaUpdated(editedCriteria);
      }
      
      setIsEditing(false);
      toast.success("Criteria updated");
    } catch (error) {
      console.error("Error updating criteria:", error);
      toast.error("Could not update criteria");
    } finally {
      setIsSaving(false);
    }
  };

  // Add a function to cancel criteria editing
  const cancelCriteriaEdit = () => {
    setEditedCriteria(criteria);
    setIsEditing(false);
  };

  // Start editing criteria
  const startEditingCriteria = () => {
    setEditedCriteria([...criteria]);
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editedCriteria.map((criterion) => (
              <div key={criterion.id} className="flex items-start gap-2">
                <Select
                  value={criterion.type}
                  onValueChange={(value) => updateCriterionType(criterion.id, value as 'inclusion' | 'exclusion')}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inclusion">Inclusion</SelectItem>
                    <SelectItem value="exclusion">Exclusion</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={criterion.text}
                  onChange={(e) => updateCriterionText(criterion.id, e.target.value)}
                  placeholder="Enter a criterion..."
                  className="flex-1 min-h-[80px] font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 mt-2"
                  onClick={() => removeCriterion(criterion.id)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addCriterion('inclusion')}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Inclusion
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addCriterion('exclusion')}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Exclusion
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={cancelCriteriaEdit}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={saveCriteria}
              disabled={isSaving}
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>Save Criteria</>
              )}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Inclusion & Exclusion Criteria</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={startEditingCriteria}
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Criteria
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Inclusion Criteria</CardTitle></CardHeader>
            <CardContent>
              {criteria.filter(c => c.type === 'inclusion').length > 0 ? (
                <ul className="list-disc pl-4 space-y-2">
                  {criteria.filter(c => c.type === 'inclusion').map(c => <li key={c.id}>{c.text}</li>)}
                </ul>
              ) : (
                <p className="text-muted-foreground">No inclusion criteria defined.</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Exclusion Criteria</CardTitle></CardHeader>
            <CardContent>
              {criteria.filter(c => c.type === 'exclusion').length > 0 ? (
                <ul className="list-disc pl-4 space-y-2">
                  {criteria.filter(c => c.type === 'exclusion').map(c => <li key={c.id}>{c.text}</li>)}
                </ul>
              ) : (
                <p className="text-muted-foreground">No exclusion criteria defined.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 