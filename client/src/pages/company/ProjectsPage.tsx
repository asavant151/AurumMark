import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  Sparkles,
  Images,
  Trash2,
  Edit2,
  FolderOpen,
} from 'lucide-react';
import { projectsApi } from '../../api/index.js';
import { Project } from '../../types/index.js';
import { Card, Button, Modal, Badge, EmptyState, ConfirmDeleteModal } from '../../components/common/index.js';
import { useAuthStore } from '../../store/authStore.js';

export const ProjectsPage: React.FC = () => {
  const { role, permissions, company } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTags, setNewProjectTags] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate =
    role === 'Company' ||
    (role === 'Designer' && (permissions?.canCreateProject || company?.settings?.allowDesignerCreateProject));

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.list({ search });
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const tags = newProjectTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await projectsApi.create({
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        tags,
      });

      setModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectTags('');
      fetchProjects();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteProject = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await projectsApi.delete(deleteTarget._id);
      setDeleteTarget(null);
      fetchProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeleting(false);
    }
  };

  const galleryPrefix =
    role === 'Company' ? '/company/gallery' : role === 'Designer' ? '/designer/gallery' : '/viewer/gallery';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-heading">
            Projects & Collections
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Organize your jewellery catalog into lines, bridal series, wholesale, and export sets.
          </p>
        </div>

        {canCreate && (
          <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Collection
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#64748B]">Loading collections...</div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No Jewellery Collections Found"
          description="Create your first collection such as Gold Rings, Diamond Earrings, or Bridal Jewellery."
          actionText={canCreate ? 'Create First Collection' : undefined}
          onAction={canCreate ? () => setModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <Card key={project._id} className="flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  {role === 'Company' && (
                    <button
                      onClick={() => setDeleteTarget(project)}
                      title="Delete Collection"
                      className="text-[#CBD5E1] hover:text-[#DC2626] transition p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-[#1E293B] font-heading group-hover:text-[#7C3AED] transition">
                  {project.name}
                </h3>
                <p className="text-xs text-[#64748B] mt-1 line-clamp-2">
                  {project.description || 'Jewellery product series.'}
                </p>

                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {project.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between gap-2.5 text-xs flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-semibold text-[#1E293B] flex items-center gap-1.5 whitespace-nowrap">
                    <Images className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
                    <span>{project.designsCount || 0} Images</span>
                  </span>
                  <span className="font-semibold text-[#16A34A] flex items-center gap-1.5 whitespace-nowrap">
                    <Sparkles className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
                    <span>{project.processedCount || 0} Watermarked</span>
                  </span>
                </div>

                <Link
                  to={`${galleryPrefix}?projectId=${project._id}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#7C3AED]/10 hover:bg-[#7C3AED] text-[#7C3AED] hover:text-white font-semibold transition text-xs whitespace-nowrap flex-shrink-0 ml-auto"
                >
                  <span>Browse</span>
                  <span>→</span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Jewellery Collection"
        description="Organize your catalogue items into a dedicated collection."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
              Collection Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Bridal Solitaire Rings 2026"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of metals, gemstones, and target market..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. gold, diamonds, bridal, export"
              value={newProjectTags}
              onChange={(e) => setNewProjectTags(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating} variant="primary" size="md">
              {creating ? 'Creating...' : 'Create Collection'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reusable Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteProject}
        title="Delete Collection?"
        description="Are you sure you want to delete this collection? Jewellery designs inside will remain safe and become unassigned."
        itemName={deleteTarget?.name}
        confirmText="Delete Collection"
        loading={deleting}
      />
    </div>
  );
};
