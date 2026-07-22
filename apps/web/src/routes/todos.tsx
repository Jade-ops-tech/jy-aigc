import { Button } from "@jy-aigc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@jy-aigc/ui/components/card";
import { Checkbox } from "@jy-aigc/ui/components/checkbox";
import { Input } from "@jy-aigc/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import {
	createTodo,
	deleteTodo,
	listTodos,
	setTodoCompleted,
	type Todo,
} from "@/lib/go-api";

const TODOS_QUERY_KEY = ["go-api", "todos"] as const;

export const Route = createFileRoute("/todos")({
	component: TodosRoute,
});

function TodosRoute() {
	const [newTodoText, setNewTodoText] = useState("");
	const queryClient = useQueryClient();

	const todos = useQuery({
		queryFn: listTodos,
		queryKey: TODOS_QUERY_KEY,
	});
	const createMutation = useMutation({
		mutationFn: createTodo,
		onSuccess: async () => {
			setNewTodoText("");
			await queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
		},
	});
	const toggleMutation = useMutation({
		mutationFn: setTodoCompleted,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
		},
	});
	const deleteMutation = useMutation({
		mutationFn: deleteTodo,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
		},
	});

	const handleAddTodo = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (newTodoText.trim()) {
			createMutation.mutate(newTodoText);
		}
	};

	const handleToggleTodo = (id: number, completed: boolean) => {
		toggleMutation.mutate({ completed: !completed, id });
	};

	const handleDeleteTodo = (id: number) => {
		deleteMutation.mutate(id);
	};

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				<CardHeader>
					<CardTitle>Todo List</CardTitle>
					<CardDescription>
						These todos are served by the new Go API.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						className="mb-6 flex items-center space-x-2"
						onSubmit={handleAddTodo}
					>
						<Input
							disabled={createMutation.isPending}
							onChange={(e) => setNewTodoText(e.target.value)}
							placeholder="Add a new task..."
							value={newTodoText}
						/>
						<Button
							disabled={createMutation.isPending || !newTodoText.trim()}
							type="submit"
						>
							{createMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Add"
							)}
						</Button>
					</form>

					<TodoList
						isLoading={todos.isLoading}
						items={todos.data}
						onDelete={handleDeleteTodo}
						onToggle={handleToggleTodo}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

interface TodoListProps {
	isLoading: boolean;
	items: Todo[] | undefined;
	onDelete: (id: number) => void;
	onToggle: (id: number, completed: boolean) => void;
}

function TodoList({ isLoading, items, onDelete, onToggle }: TodoListProps) {
	if (isLoading) {
		return (
			<div className="flex justify-center py-4">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	if (!items?.length) {
		return <p className="py-4 text-center">No todos yet. Add one above!</p>;
	}

	return (
		<ul className="space-y-2">
			{items.map((todo) => (
				<li
					className="flex items-center justify-between rounded-md border p-2"
					key={todo.id}
				>
					<div className="flex items-center space-x-2">
						<Checkbox
							checked={todo.completed}
							id={`todo-${todo.id}`}
							onCheckedChange={() => onToggle(todo.id, todo.completed)}
						/>
						<label
							className={todo.completed ? "line-through" : ""}
							htmlFor={`todo-${todo.id}`}
						>
							{todo.text}
						</label>
					</div>
					<Button
						aria-label="Delete todo"
						onClick={() => onDelete(todo.id)}
						size="icon"
						variant="ghost"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</li>
			))}
		</ul>
	);
}
