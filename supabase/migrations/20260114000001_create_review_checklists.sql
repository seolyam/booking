-- Create review_checklists table for storing reviewer checklist states
CREATE TABLE review_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id),
  item_key text NOT NULL,
  item_label text NOT NULL,
  is_checked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index for efficient querying
CREATE INDEX idx_review_checklists_budget_reviewer 
ON review_checklists(budget_id, reviewer_id);

CREATE INDEX idx_review_checklists_budget_id 
ON review_checklists(budget_id);
