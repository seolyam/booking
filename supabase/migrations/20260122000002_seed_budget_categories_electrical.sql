-- Seed detailed CAPEX and OPEX categories for an electrical company
-- Uses budget_categories (name UNIQUE, description, allowed_type, is_active)

-- =========================
-- CAPEX CATEGORIES
-- =========================
INSERT INTO public.budget_categories (name, description, allowed_type, is_active) VALUES
  ('Service vans', 'Fully outfitted service vans for field mobility', 'CAPEX', true),
  ('Bucket trucks', 'Aerial lift trucks for overhead work', 'CAPEX', true),
  ('Pole trucks', 'Trucks used for transporting and setting poles', 'CAPEX', true),
  ('Cable-pulling trailers', 'Trailers for cable pulling operations', 'CAPEX', true),
  ('Enclosed jobsite tool trailers', 'Secured enclosed trailers for tools at jobsites', 'CAPEX', true),
  ('Flatbed trucks', 'Flatbed trucks for transporting materials', 'CAPEX', true),

  ('High-voltage test equipment', 'HV test sets, hipot testers', 'CAPEX', true),
  ('Insulation resistance testers (megger)', 'High-value insulation testing instruments', 'CAPEX', true),
  ('Primary injection test sets', 'Primary injection testing equipment', 'CAPEX', true),
  ('Secondary injection test sets', 'Secondary injection testing equipment', 'CAPEX', true),
  ('Transformer turn-ratio testers', 'TTR testers for transformer diagnostics', 'CAPEX', true),
  ('Thermal imaging cameras (FLIR)', 'Thermal cameras for diagnostics', 'CAPEX', true),
  ('Ground resistivity meters', 'Ground testing and resistivity meters', 'CAPEX', true),
  ('Power quality analyzers', 'Analyzers for power quality diagnostics', 'CAPEX', true),
  ('Time-domain reflectometers (TDRs)', 'TDRs for cable fault location', 'CAPEX', true),

  ('Cable pulling machines (capstan winches)', 'Power-assisted cable pulling machinery', 'CAPEX', true),
  ('Hydraulic crimping tools (industrial-grade)', 'Industrial-grade hydraulic crimpers', 'CAPEX', true),
  ('Pipe benders (hydraulic/electric)', 'Pipe bending equipment', 'CAPEX', true),
  ('Conduit threading machines', 'Machines for threading conduit', 'CAPEX', true),
  ('Trenchers (purchased)', 'Owned trenching equipment', 'CAPEX', true),
  ('Scissor lifts / boom lifts (purchased)', 'Owned lifts for access work', 'CAPEX', true),
  ('Generators (standby operations)', 'Standby generators used for operations', 'CAPEX', true),

  ('Warehouse purchase/build-out', 'Facility purchase or build-out improvements', 'CAPEX', true),
  ('Storage yard improvements', 'Paving, fencing, lighting installation', 'CAPEX', true),
  ('Tool crib systems', 'Secured inventory lockers/systems', 'CAPEX', true),
  ('Heavy shelving and pallet racking', 'Warehouse racking and heavy shelving', 'CAPEX', true),
  ('Electrical shop benches/stations', 'Built-in benches and stations', 'CAPEX', true),

  ('Project management system (capitalizable)', 'Capitalizable license or implementation', 'CAPEX', true),
  ('CAD/engineering software (perpetual)', 'Perpetual engineering/CAD licenses', 'CAPEX', true),
  ('Server infrastructure', 'Servers and related infrastructure', 'CAPEX', true),
  ('Office workstations (engineering)', 'Workstations for engineering team', 'CAPEX', true),
  ('Network hardware (switches/routers)', 'Switches, routers and network gear', 'CAPEX', true),

  ('Proprietary testing procedures (development)', 'Development of proprietary procedures', 'CAPEX', true),
  ('Capitalized software customization', 'Capitalized design software customization', 'CAPEX', true)
ON CONFLICT (name) DO UPDATE SET
  allowed_type = EXCLUDED.allowed_type,
  description = EXCLUDED.description,
  is_active = true;

-- =========================
-- OPEX CATEGORIES
-- =========================
INSERT INTO public.budget_categories (name, description, allowed_type, is_active) VALUES
  ('Electrical wire & cable', 'THHN, XHHW, armored, feeder cable', 'OPEX', true),
  ('Conduits', 'EMT, PVC, IMC, Rigid', 'OPEX', true),
  ('Conduit fittings/couplings/straps', 'Fittings, couplings, straps for conduit', 'OPEX', true),
  ('Breakers and distribution panels', 'Breakers, panels and accessories', 'OPEX', true),
  ('Switches/relays/contactors', 'Switchgear components', 'OPEX', true),
  ('Receptacles and lighting fixtures', 'Plugs, receptacles, luminaires', 'OPEX', true),
  ('Transformers (customer site)', 'Transformers installed at customer site (not owned)', 'OPEX', true),
  ('Junction boxes and enclosures', 'Boxes and enclosures for jobs', 'OPEX', true),
  ('Fasteners and anchors', 'Unistrut, threaded rod, clamps, anchors', 'OPEX', true),
  ('Temporary power supplies (jobsite)', 'Temporary power arrangements', 'OPEX', true),

  ('Electrician wages', 'Direct labor costs for electricians', 'OPEX', true),
  ('Apprentices/technicians wages', 'Direct labor for apprentices/techs', 'OPEX', true),
  ('Union labor costs', 'Union labor premiums and costs', 'OPEX', true),
  ('Subcontracted trenching/boring', 'Directional boring or trenching (subcontracted)', 'OPEX', true),
  ('Subcontracted civil/concrete work', 'Civil or concrete subcontract work', 'OPEX', true),
  ('Fire alarm subcontract labor', 'Subcontract labor for fire alarm', 'OPEX', true),

  ('Lift rentals', 'Boom/scissor lift rentals', 'OPEX', true),
  ('Generator rentals', 'Jobsite generator rentals', 'OPEX', true),
  ('Trencher/excavator rentals', 'Trenchers and excavators rentals', 'OPEX', true),
  ('Temporary lighting rentals', 'Temporary lighting rentals', 'OPEX', true),
  ('Crane rentals', 'Cranes for transformer/gear setting', 'OPEX', true),

  ('Tape (electrical/caution/friction)', 'Consumable tapes for field use', 'OPEX', true),
  ('Wire nuts/lugs/terminations', 'Electrical connection consumables', 'OPEX', true),
  ('Zip ties/screws/bolts', 'General fastening consumables', 'OPEX', true),
  ('Drill bits/hole saws/knockouts', 'Cutting/drilling consumables', 'OPEX', true),
  ('Gloves/PPE/safety glasses/FR gear', 'Safety gear and PPE', 'OPEX', true),
  ('Batteries (AA/AAA/tool)', 'Batteries for tools and devices', 'OPEX', true),
  ('Saw blades/cutting wheels/grinding discs', 'Cutting and grinding consumables', 'OPEX', true),

  ('Calibration of test equipment', 'Calibration for megger, TDR, FLIR, analyzers', 'OPEX', true),
  ('Repairs of hydraulic crimpers', 'Repair costs for crimpers', 'OPEX', true),
  ('Tool sharpening & maintenance', 'Routine tool upkeep', 'OPEX', true),
  ('Vehicle maintenance', 'Oil, brakes, tires', 'OPEX', true),
  ('Lift and generator maintenance', 'Maintenance for lifts and generators', 'OPEX', true),

  ('Facility electricity', 'Shop and office electricity', 'OPEX', true),
  ('Water/HVAC servicing', 'Water and HVAC servicing', 'OPEX', true),
  ('Warehouse/yard lease payments', 'Lease costs for warehouse/yard', 'OPEX', true),
  ('Office rent', 'Office space rent', 'OPEX', true),
  ('Office repairs & maintenance', 'Repairs and maintenance for office', 'OPEX', true),
  ('Waste disposal/recycling pickups', 'Waste and recycling services', 'OPEX', true),

  ('Software subscriptions', 'AutoCAD, Procore, ServiceTitan, etc.', 'OPEX', true),
  ('Cloud storage', 'Microsoft 365, Google Workspace', 'OPEX', true),
  ('Antivirus subscriptions', 'Security software subscriptions', 'OPEX', true),
  ('IT support services', 'Managed services and support', 'OPEX', true),
  ('Telecom & internet services', 'Phone and internet services', 'OPEX', true),

  ('Office supplies', 'General office consumables', 'OPEX', true),
  ('Jobsite printing (plans/permits)', 'Printing for jobsites and permits', 'OPEX', true),
  ('Insurance', 'GL, auto, workers’ comp', 'OPEX', true),
  ('Uniform service', 'Rental cleaning for field staff', 'OPEX', true),
  ('Tool inventory replacement', 'Damaged/lost non-capital tools', 'OPEX', true),
  ('Bank fees/payroll processing', 'Bank fees and payroll services', 'OPEX', true),
  ('Training (NFPA 70E/OSHA 30/LOTO)', 'Safety and compliance training', 'OPEX', true),

  ('Bidding software subscription', 'Estimator package subscription', 'OPEX', true),
  ('Travel for job walkthroughs', 'Travel for estimates and walkthroughs', 'OPEX', true),
  ('Marketing/website hosting', 'Marketing and web hosting costs', 'OPEX', true),
  ('Customer entertainment', 'Business development entertainment', 'OPEX', true),
  ('Trade show costs', 'Trade show and exhibition costs', 'OPEX', true)
ON CONFLICT (name) DO UPDATE SET
  allowed_type = EXCLUDED.allowed_type,
  description = EXCLUDED.description,
  is_active = true;
