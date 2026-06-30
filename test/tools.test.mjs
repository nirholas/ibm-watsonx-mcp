// Smoke tests for the watsonx tool surface. Tool enumeration is secret-free:
// buildTools(client) only closes over the client for handler execution, so the
// definitions can be inspected without any WATSONX_* credentials.
//
// Run: node --test packages/ibm-watsonx-mcp/test/tools.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildTools } from '../src/tools.js';

// Guarantee enumeration works with no credentials in the environment.
delete process.env.WATSONX_API_KEY;
delete process.env.WATSONX_PROJECT_ID;
delete process.env.WATSONX_SPACE_ID;

const tools = buildTools(null);
const definitions = tools.map((t) => t.definition);

// Generative tools may return different output for identical input; the
// deterministic ones always return the same result for the same arguments.
const GENERATIVE = ['watsonx_chat', 'watsonx_generate', 'watsonx_forecast'];
const DETERMINISTIC = ['watsonx_embed', 'watsonx_tokenize', 'watsonx_list_models'];

test('exposes exactly the six documented tools', () => {
	const names = definitions.map((d) => d.name).sort();
	assert.deepEqual(names, [...GENERATIVE, ...DETERMINISTIC].sort());
});

test('tool names are unique', () => {
	const names = definitions.map((d) => d.name);
	assert.equal(new Set(names).size, names.length);
});

test('every tool has a non-empty description and human title', () => {
	for (const d of definitions) {
		assert.ok(
			typeof d.description === 'string' && d.description.trim().length > 0,
			`${d.name} description`,
		);
		assert.ok(typeof d.title === 'string' && d.title.trim().length > 0, `${d.name} title`);
	}
});

test('every tool has an object input schema', () => {
	for (const d of definitions) {
		assert.ok(d.inputSchema, `${d.name} inputSchema missing`);
		assert.equal(d.inputSchema.type, 'object', `${d.name} inputSchema.type`);
	}
});

test('every tool is annotated read-only and open-world (pure inference calls)', () => {
	for (const d of definitions) {
		assert.ok(d.annotations, `${d.name} annotations missing`);
		assert.equal(d.annotations.readOnlyHint, true, `${d.name} readOnlyHint`);
		assert.equal(d.annotations.openWorldHint, true, `${d.name} openWorldHint`);
	}
});

test('generative tools are marked non-idempotent; deterministic tools idempotent', () => {
	const byName = new Map(definitions.map((d) => [d.name, d]));
	for (const name of GENERATIVE) {
		assert.equal(byName.get(name).annotations.idempotentHint, false, `${name} idempotentHint`);
	}
	for (const name of DETERMINISTIC) {
		assert.equal(byName.get(name).annotations.idempotentHint, true, `${name} idempotentHint`);
	}
});

test('every tool pairs its definition with a handler function', () => {
	for (const t of tools) {
		assert.equal(typeof t.handler, 'function', `${t.definition.name} handler`);
	}
});
