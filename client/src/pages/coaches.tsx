import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Users, Pencil, Trash2, UserMinus, UserCheck } from "lucide-react";
import { useLocation } from "wouter";
import type { Coach } from "@shared/schema";
import { useState } from "react";

const coachFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  level: z.string().min(1, "Level is required"),
  dob: z.string().optional(),
});

type CoachFormValues = z.infer<typeof coachFormSchema>;

interface AuthUser {
  role?: string;
}

export default function Coaches() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [deletingCoach, setDeletingCoach] = useState<Coach | null>(null);
  const [deactivatingCoach, setDeactivatingCoach] = useState<Coach | null>(null);
  const [reactivatingCoach, setReactivatingCoach] = useState<Coach | null>(null);

  const { data: currentUser } = useQuery<AuthUser>({ queryKey: ["/api/auth/user"] });
  const isAdmin = currentUser?.role === "admin";

  // Active coaches (standard endpoint)
  const { data: activeCoaches, isLoading: isLoadingActive } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
  });

  // All coaches including inactive (admin only)
  const { data: allCoaches, isLoading: isLoadingAll } = useQuery<Coach[]>({
    queryKey: ["/api/coaches/all"],
    enabled: isAdmin,
  });

  // Use all coaches for admins (to show inactive ones), active-only for others
  const coaches = isAdmin ? (allCoaches ?? activeCoaches ?? []) : (activeCoaches ?? []);
  const isLoading = isAdmin ? isLoadingAll : isLoadingActive;

  const form = useForm<CoachFormValues>({
    resolver: zodResolver(coachFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      level: "",
      dob: "",
    },
  });

  const createCoachMutation = useMutation({
    mutationFn: async (data: CoachFormValues) => {
      return await apiRequest("POST", "/api/coaches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/all"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add coach",
        variant: "destructive",
      });
    },
  });

  const updateCoachMutation = useMutation({
    mutationFn: async (data: CoachFormValues & { id: string }) => {
      return await apiRequest("PATCH", `/api/coaches/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/all"] });
      setEditingCoach(null);
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coach",
        variant: "destructive",
      });
    },
  });

  const deleteCoachMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/coaches/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/all"] });
      toast({ title: "Success", description: "Coach deleted successfully" });
      setDeletingCoach(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete coach", variant: "destructive" });
    },
  });

  const deactivateCoachMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/coaches/${id}/deactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/all"] });
      toast({ title: "Coach deactivated", description: "The coach and their login have been deactivated. Billing updated." });
      setDeactivatingCoach(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to deactivate coach", variant: "destructive" });
    },
  });

  const reactivateCoachMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/coaches/${id}/reactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/all"] });
      toast({ title: "Coach reactivated", description: "The coach has been reactivated. Billing updated." });
      setReactivatingCoach(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to reactivate coach", variant: "destructive" });
    },
  });

  const onSubmit = (data: CoachFormValues) => {
    if (editingCoach) {
      updateCoachMutation.mutate({ ...data, id: editingCoach.id });
    } else {
      createCoachMutation.mutate(data);
    }
  };

  const handleEdit = (coach: Coach) => {
    setEditingCoach(coach);
    setDialogOpen(true);
    form.reset({
      firstName: coach.firstName,
      lastName: coach.lastName,
      level: coach.level,
      dob: coach.dob,
    });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCoach(null);
    form.reset({ firstName: "", lastName: "", level: undefined, dob: "" });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Level 3": return "default";
      case "Level 2": return "secondary";
      case "Level 1": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Coaches</h1>
                <p className="text-sm text-muted-foreground">Manage coaching staff</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (open) setDialogOpen(true); else handleCloseDialog(); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-coach">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Coach
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCoach ? "Edit Coach" : "Add New Coach"}</DialogTitle>
                  <DialogDescription>
                    {editingCoach ? "Update the coach's details below" : "Enter the coach's details below"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl><Input {...field} data-testid="input-first-name" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl><Input {...field} data-testid="input-last-name" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qualification Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-level">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Level 3">Level 3</SelectItem>
                              <SelectItem value="Level 2">Level 2</SelectItem>
                              <SelectItem value="Level 1">Level 1</SelectItem>
                              <SelectItem value="No qualification">No qualification</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl><Input type="date" {...field} data-testid="input-dob" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                      <Button
                        type="submit"
                        disabled={createCoachMutation.isPending || updateCoachMutation.isPending}
                        data-testid="button-submit-coach"
                      >
                        {editingCoach
                          ? (updateCoachMutation.isPending ? "Updating..." : "Update Coach")
                          : (createCoachMutation.isPending ? "Adding..." : "Add Coach")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Card key={i} className="h-32" />)}
          </div>
        ) : coaches && coaches.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map((coach) => {
              const isInactive = coach.recordStatus === "inactive";
              return (
                <Card
                  key={coach.id}
                  className={isInactive ? "opacity-50" : "hover-elevate"}
                  data-testid={`card-coach-${coach.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">
                          {coach.firstName} {coach.lastName}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">DOB: {coach.dob}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={getLevelColor(coach.level) as any}>{coach.level}</Badge>
                        {isInactive && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-inactive-${coach.id}`}>
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {!isInactive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(coach)}
                          data-testid={`button-edit-coach-${coach.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      {isAdmin && !isInactive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeactivatingCoach(coach)}
                          data-testid={`button-deactivate-coach-${coach.id}`}
                        >
                          <UserMinus className="w-4 h-4 mr-1" />
                          Deactivate
                        </Button>
                      )}
                      {isAdmin && isInactive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReactivatingCoach(coach)}
                          data-testid={`button-reactivate-coach-${coach.id}`}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Reactivate
                        </Button>
                      )}
                      {isAdmin && !isInactive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingCoach(coach)}
                          data-testid={`button-delete-coach-${coach.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No coaches added yet</p>
              <p className="text-sm text-muted-foreground mt-2">Click "Add Coach" to get started</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete coach dialog */}
      <AlertDialog open={!!deletingCoach} onOpenChange={() => setDeletingCoach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coach</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingCoach?.firstName} {deletingCoach?.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCoach && deleteCoachMutation.mutate(deletingCoach.id)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate coach dialog */}
      <AlertDialog open={!!deactivatingCoach} onOpenChange={() => setDeactivatingCoach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Coach</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {deactivatingCoach?.firstName} {deactivatingCoach?.lastName}?
              They will no longer be able to log in and will be removed from your active billing count.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-deactivate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deactivateCoachMutation.isPending}
              onClick={() => deactivatingCoach && deactivateCoachMutation.mutate(deactivatingCoach.id)}
              data-testid="button-confirm-deactivate"
            >
              {deactivateCoachMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate coach dialog */}
      <AlertDialog open={!!reactivatingCoach} onOpenChange={() => setReactivatingCoach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Coach</AlertDialogTitle>
            <AlertDialogDescription>
              Reactivate {reactivatingCoach?.firstName} {reactivatingCoach?.lastName}? They will regain access and will be included in your active billing count again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reactivate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={reactivateCoachMutation.isPending}
              onClick={() => reactivatingCoach && reactivateCoachMutation.mutate(reactivatingCoach.id)}
              data-testid="button-confirm-reactivate"
            >
              {reactivateCoachMutation.isPending ? "Reactivating..." : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
