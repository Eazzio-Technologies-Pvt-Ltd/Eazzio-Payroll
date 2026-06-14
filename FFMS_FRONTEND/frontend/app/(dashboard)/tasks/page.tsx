"use client";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { createTaskAsync, fetchTasks, deleteTaskAsync, updateTaskStatus, Task } from "@/store/slices/taskSlice";
import { Employee } from "@/store/slices/employeeSlice";
import { getStatusColor } from "@/lib/utils";
import { Plus, Trash2, X, Flag, Calendar, User, Mail, CheckCircle } from "lucide-react";
import CloudinaryImage from "@/components/common/CloudinaryImage";

const STATUSES = ["pending", "in-progress", "completed"];
const PRIORITIES = ["low", "medium", "high"];

function TaskModal({ onClose, onSave, employees }: { onClose: () => void; onSave: (data: any, sendEmail: boolean, empEmail: string) => void; employees: Employee[] }) {
  const [form, setForm] = useState({ title:"", description:"", employeeId: employees[0]?.id||"", priority:"medium", deadline:"", territory:"" });
  const [sendEmail, setSendEmail] = useState(true);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const emp = employees.find(e => e.id === form.employeeId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth:"520px" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px" }}>
          <h2 style={{ fontWeight:700,fontSize:"18px" }}>Create New Task</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={20}/></button>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:"14px" }}>
          <div>
            <label style={{ fontSize:"12px",fontWeight:600,color:"var(--text-secondary)",display:"block",marginBottom:"6px" }}>Task Title</label>
            <input className="input" value={form.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Client Visit — ABC Corp" />
          </div>
          <div>
            <label style={{ fontSize:"12px",fontWeight:600,color:"var(--text-secondary)",display:"block",marginBottom:"6px" }}>Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Task details..." style={{ resize:"vertical" }} />
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
            <div>
              <label style={{ fontSize:"12px",fontWeight:600,color:"var(--text-secondary)",display:"block",marginBottom:"6px" }}>Assign To</label>
              <select className="input" value={form.employeeId} onChange={e=>set("employeeId",e.target.value)}>
                {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:"12px",fontWeight:600,color:"var(--text-secondary)",display:"block",marginBottom:"6px" }}>Priority</label>
              <select className="input" value={form.priority} onChange={e=>set("priority",e.target.value)}>
                {PRIORITIES.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize:"12px",fontWeight:600,color:"var(--text-secondary)",display:"block",marginBottom:"6px" }}>Deadline</label>
            <input className="input" type="date" value={form.deadline} onChange={e=>set("deadline",e.target.value)} />
          </div>


          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-secondary)", cursor: "pointer", marginTop: "4px" }}>
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ cursor: "pointer" }} />
            <Mail size={14} color={sendEmail ? "var(--accent-blue)" : "var(--text-muted)"} />
            Send email notification to {emp?.name || "employee"} ({emp?.email || ""})
          </label>

          <button className="btn-primary" style={{ width:"100%",justifyContent:"center",marginTop:"4px" }}
            onClick={()=>{
              if(!form.title.trim()) return;
              onSave({ 
                title: form.title, 
                description: form.description, 
                priority: form.priority.toUpperCase(),
                assigneeIds: [form.employeeId],
                dueDate: form.deadline ? new Date(form.deadline).toISOString() : undefined
              }, sendEmail, emp?.email || "");
            }}>
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const dispatch = useDispatch<AppDispatch>();
  const tasks = useSelector((s: RootState) => s.tasks.list);
  const employees = useSelector((s: RootState) => s.employees.list);
  const user = useSelector((s: RootState) => s.auth.user);
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  const filteredEmployees = employees.filter(e => {
    if (user?.role === "ADMIN") {
      return e.role === "MANAGER";
    }
    if (user?.role === "MANAGER") {
      return e.role === "FIELD_STAFF" || e.role === "OFFICE_STAFF";
    }
    return true;
  });

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);
  const counts = { all: tasks.length, pending: tasks.filter(t=>t.status==="pending").length, "in-progress": tasks.filter(t=>t.status==="in-progress").length, completed: tasks.filter(t=>t.status==="completed").length };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px" }}>
        <div>
          <div className="page-title">Tasks</div>
          <div className="page-subtitle">{tasks.length} total tasks assigned</div>
        </div>
        <button className="btn-primary" onClick={()=>setModal(true)}><Plus size={16}/> New Task</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex",gap:"8px",marginBottom:"20px" }}>
        {(["all","pending","in-progress","completed"] as const).map(s => (
          <button key={s} onClick={()=>setFilter(s)} style={{
            padding:"7px 16px", borderRadius: "0", border:"1px solid", cursor:"pointer", fontSize:"13px", fontWeight:500,
            background: filter===s ? "linear-gradient(135deg,#4f8ef7,#7c5ffc)" : "var(--bg-card)",
            borderColor: filter===s ? "transparent" : "var(--border)",
            color: filter===s ? "white" : "var(--text-secondary)",
            transition:"all 0.2s"
          }}>
            {s.charAt(0).toUpperCase()+s.slice(1)} <span style={{ opacity:0.7 }}>({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Task cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:"14px" }}>
        {filtered.map(task => (
          <div key={task.id} className="card" style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
            {/* Title + delete */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px" }}>
              <div style={{ fontWeight:700,fontSize:"14px",lineHeight:1.4,flex:1 }}>{task.title}</div>
              <button onClick={()=>dispatch(deleteTaskAsync(task.id))} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",flexShrink:0 }}><Trash2 size={15}/></button>
            </div>
            <div style={{ fontSize:"13px",color:"var(--text-secondary)",lineHeight:1.5 }}>{task.description}</div>

            {task.status === "completed" && (task.completionNote || (task.completionImages && task.completionImages.length > 0)) && (
              <div style={{ padding: "10px", background: "rgba(34,211,165,0.04)", border: "1px solid rgba(34,211,165,0.15)", borderRadius: "6px", marginTop: "4px" }}>
                {task.completionNote && (
                  <div style={{ fontSize: "12px", color: "var(--text-primary)", marginBottom: task.completionImages && task.completionImages.length > 0 ? "8px" : 0 }}>
                    <strong>Completion Note:</strong> {task.completionNote}
                  </div>
                )}
                {task.completionImages && task.completionImages.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {task.completionImages.map((imgUrl: string, idx: number) => (
                      <CloudinaryImage key={idx} url={imgUrl} placeholder="No Image" alt="Completion Proof" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Meta */}
            <div style={{ display:"flex",flexWrap:"wrap",gap:"8px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"var(--text-muted)" }}>
                <User size={12}/> {task.assignedTo}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"var(--text-muted)" }}>
                <Calendar size={12}/> {task.deadline || "No deadline"}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"var(--text-muted)" }}>
                <Flag size={12}/> <span className={`badge ${getStatusColor(task.priority)}`} style={{ fontSize:"10px",padding:"1px 7px" }}>{task.priority}</span>
              </div>
            </div>

            {/* Status + change */}
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:"10px",borderTop:"1px solid var(--border)" }}>
              <span className={`badge ${getStatusColor(task.status)}`}>{task.status}</span>
              <select
                value={task.status}
                onChange={e=>dispatch(updateTaskStatus({id:task.id,status:e.target.value}))}
                style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",color:"var(--text-secondary)",borderRadius: "0",padding:"4px 8px",fontSize:"12px",cursor:"pointer",outline:"none",fontFamily:"Inter,sans-serif" }}
              >
                {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign:"center",padding:"60px",color:"var(--text-muted)" }}>No tasks found.</div>
      )}

      {modal && <TaskModal employees={filteredEmployees} onClose={()=>setModal(false)} onSave={(data, sendEmail, empEmail)=>{ 
        dispatch(createTaskAsync(data)); 
        setModal(false); 
        if (sendEmail) {
          setToast(`Task assigned successfully. Email notification sent to ${empEmail}.`);
          setTimeout(() => setToast(null), 4000);
        }
      }} />}

      {/* Floating toast notification */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          zIndex: 9999,
          animation: "fadeIn 0.2s ease",
          border: "1px solid var(--accent-green)",
          borderLeft: "4px solid var(--accent-green)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          <div style={{ background: "rgba(34,211,165,0.1)", borderRadius: "50%", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={16} color="var(--accent-green)" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, fontFamily: "Inter, sans-serif" }}>Email Sent</span>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
