-- Database triggers for test drive requests
-- Optionally calls Edge Function on status changes

-- Function to notify Edge Function on status change
create or replace function notify_test_drive_status_change()
returns trigger
language plpgsql
security definer
as $$
declare
  payload jsonb;
begin
  -- Only trigger if status actually changed
  if OLD.status is distinct from NEW.status then
    payload := jsonb_build_object(
      'request_id', NEW.id,
      'notification_type', 'status_update',
      'status', NEW.status
    );
    
    -- Call Edge Function via pg_net (if available) or log for manual processing
    -- Note: This requires pg_net extension or manual webhook setup
    -- For now, we'll just log it - Edge Function can be called directly from API
    raise log 'Test drive status changed: request_id=%, old_status=%, new_status=%', 
      NEW.id, OLD.status, NEW.status;
    
    -- If pg_net is available, uncomment this:
    -- perform net.http_post(
    --   url := current_setting('app.settings.edge_function_url') || '/send-test-drive-notification',
    --   headers := jsonb_build_object('Content-Type', 'application/json'),
    --   body := payload::text
    -- );
  end if;
  
  return NEW;
end;
$$;

-- Trigger on status update
drop trigger if exists test_drive_status_change_trigger on test_drive_requests;
create trigger test_drive_status_change_trigger
  after update of status on test_drive_requests
  for each row
  when (OLD.status is distinct from NEW.status)
  execute function notify_test_drive_status_change();

-- Function to log new test drive requests
create or replace function log_test_drive_creation()
returns trigger
language plpgsql
as $$
begin
  -- Log creation (can be used for analytics)
  raise log 'Test drive request created: request_id=%, vehicle_model=%, preferred_date=%', 
    NEW.id, NEW.vehicle_model, NEW.preferred_date;
  
  return NEW;
end;
$$;

-- Trigger on insert
drop trigger if exists test_drive_creation_trigger on test_drive_requests;
create trigger test_drive_creation_trigger
  after insert on test_drive_requests
  for each row
  execute function log_test_drive_creation();

