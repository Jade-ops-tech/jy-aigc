import { env } from "@jy-aigc/env/web";

export interface Todo {
	completed: boolean;
	id: number;
	text: string;
}

export interface ProfileIntroduction {
	introduction: string;
	username: string;
}

interface ApiErrorResponse {
	error?: string;
}

const requestJSON = async <ResponseBody>(
	path: string,
	init?: RequestInit
): Promise<ResponseBody> => {
	const response = await fetch(`${env.VITE_GO_API_URL}${path}`, init);
	if (!response.ok) {
		let message = `Go API request failed with status ${response.status}`;
		try {
			const body = (await response.json()) as ApiErrorResponse;
			message = body.error ?? message;
		} catch {
			// Keep the status-based message when the response is not JSON.
		}
		throw new Error(message);
	}

	return (await response.json()) as ResponseBody;
};

export const listTodos = (): Promise<Todo[]> => requestJSON("/api/todos");

export const createTodo = (text: string): Promise<Todo> =>
	requestJSON("/api/todos", {
		body: JSON.stringify({ text }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});

export const setTodoCompleted = ({
	completed,
	id,
}: Pick<Todo, "completed" | "id">): Promise<Todo> =>
	requestJSON(`/api/todos/${id}`, {
		body: JSON.stringify({ completed }),
		headers: { "Content-Type": "application/json" },
		method: "PATCH",
	});

export const deleteTodo = async (id: number): Promise<void> => {
	const response = await fetch(`${env.VITE_GO_API_URL}/api/todos/${id}`, {
		method: "DELETE",
	});
	if (!response.ok) {
		throw new Error(`Unable to delete todo (status ${response.status})`);
	}
};

export const getProfileIntroduction = (
	username: string
): Promise<ProfileIntroduction> =>
	requestJSON(`/api/profile/${encodeURIComponent(username)}`);
