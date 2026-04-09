export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

export interface ChatRequest {
  user_input: string;
  type_id?: string;
}
