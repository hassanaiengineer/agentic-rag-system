import re
from dataclasses import dataclass

from app.services.ingestion import StructuredDocument


@dataclass
class Chunk:
    chunk_id: int
    text: str
    section: str | None
    page_number: int


class ChunkingService:
    def __init__(self, chunk_size_tokens: int = 650, chunk_overlap_tokens: int = 120):
        # Enforce product constraints (500-700 tokens) regardless of config drift.
        self.chunk_size_tokens = max(500, min(700, int(chunk_size_tokens)))
        self.chunk_overlap_tokens = max(0, int(chunk_overlap_tokens))

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        return max(1, len(text.split()))

    @staticmethod
    def _detect_section(paragraph: str) -> str | None:
        line = paragraph.strip().split("\n", maxsplit=1)[0]
        if re.match(r"^[A-Z][A-Za-z0-9\s\-:]{2,80}$", line) and len(line.split()) <= 10:
            return line
        if re.match(r"^\d+(\.\d+)*\s+", line):
            return line[:120]
        return None

    def chunk_structured_document(self, doc: StructuredDocument) -> list[Chunk]:
        chunks: list[Chunk] = []
        current_parts: list[str] = []
        current_tokens = 0
        current_section: str | None = None
        chunk_start_page = 1

        for page in doc.pages:
            # Paragraph-first: treat each extracted block as a paragraph unit.
            paragraphs = [b.text.strip() for b in page.blocks if b.text and b.text.strip()]
            for para in paragraphs:
                para_tokens = self._estimate_tokens(para)
                para_section = self._detect_section(para)
                if para_section:
                    current_section = para_section

                # Capture the start page when starting a new chunk
                if not current_parts:
                    chunk_start_page = page.page

                if current_tokens + para_tokens > self.chunk_size_tokens and current_parts:
                    chunk_text = "\n\n".join(current_parts)
                    chunks.append(
                        Chunk(
                            chunk_id=len(chunks),
                            text=chunk_text,
                            section=current_section,
                            page_number=chunk_start_page,
                        )
                    )

                    overlap_text = self._build_overlap(current_parts)
                    current_parts = [overlap_text] if overlap_text else []
                    current_tokens = self._estimate_tokens(overlap_text) if overlap_text else 0
                    
                    # Next chunk starts approximately here
                    chunk_start_page = page.page

                current_parts.append(para)
                current_tokens += para_tokens

        if current_parts:
            chunks.append(
                Chunk(
                    chunk_id=len(chunks),
                    text="\n\n".join(current_parts),
                    section=current_section,
                    page_number=chunk_start_page,
                )
            )

        chunks = self._enforce_min_chunks(chunks)
        # Reassign contiguous ids after any splits.
        for i, c in enumerate(chunks):
            c.chunk_id = i
        return chunks

    def _build_overlap(self, parts: list[str]) -> str:
        tail: list[str] = []
        token_count = 0
        for part in reversed(parts):
            part_tokens = self._estimate_tokens(part)
            if token_count + part_tokens > self.chunk_overlap_tokens:
                break
            tail.insert(0, part)
            token_count += part_tokens
        return "\n\n".join(tail)

    def _enforce_min_chunks(self, chunks: list[Chunk]) -> list[Chunk]:
        # If the entire document is naturally smaller than one chunk size, allow it to be 1 chunk.
        if not chunks:
            return []
            
        total_tokens = sum(self._estimate_tokens(c.text) for c in chunks)
        if total_tokens <= self.chunk_size_tokens:
            return chunks

        if len(chunks) >= 3:
            return chunks

        # Iteratively split the largest chunk until we have at least 3 chunks.
        # Keep overlap at 100 tokens (or configured) to preserve continuity.
        working = list(chunks)
        while len(working) < 3:
            largest_idx = max(range(len(working)), key=lambda i: self._estimate_tokens(working[i].text))
            largest = working[largest_idx]
            split = self._split_chunk(largest)
            if len(split) == 1:
                # If we cannot split further, break to avoid infinite loops.
                break
            working.pop(largest_idx)
            # Preserve ordering by inserting in place.
            for item in reversed(split):
                working.insert(largest_idx, item)

        return working

    def _split_chunk(self, chunk: Chunk) -> list[Chunk]:
        # Prefer splitting on paragraph boundaries.
        paragraphs = [p.strip() for p in chunk.text.split("\n\n") if p.strip()]
        if len(paragraphs) >= 2:
            mid = len(paragraphs) // 2
            left = "\n\n".join(paragraphs[:mid])
            right = "\n\n".join(paragraphs[mid:])
            if self._estimate_tokens(left) == 0 or self._estimate_tokens(right) == 0:
                return [chunk]

            # Apply overlap by taking tail tokens from left into right.
            if self.chunk_overlap_tokens > 0:
                overlap = self._overlap_words(left, self.chunk_overlap_tokens)
                right = f"{overlap}\n\n{right}".strip()

            return [
                Chunk(chunk_id=chunk.chunk_id, text=left, section=chunk.section, page_number=chunk.page_number),
                Chunk(chunk_id=chunk.chunk_id + 1, text=right, section=chunk.section, page_number=chunk.page_number),
            ]

        # Fallback: split by words.
        return self._force_word_splits(chunk, target_chunks=2)

    def _force_word_splits(self, chunk: Chunk, target_chunks: int) -> list[Chunk]:
        words = chunk.text.split()
        if len(words) < target_chunks + 1:
            return [chunk]

        base = max(1, len(words) // target_chunks)
        pieces: list[Chunk] = []
        start = 0
        for i in range(target_chunks):
            end = len(words) if i == target_chunks - 1 else min(len(words), start + base)
            text = " ".join(words[start:end]).strip()
            if text:
                pieces.append(Chunk(chunk_id=chunk.chunk_id + i, text=text, section=chunk.section, page_number=chunk.page_number))
            if end >= len(words):
                break
            # Overlap
            start = max(0, end - self.chunk_overlap_tokens)
        return pieces if len(pieces) >= 2 else [chunk]

    @staticmethod
    def _overlap_words(text: str, overlap_tokens: int) -> str:
        words = text.split()
        if not words:
            return ""
        return " ".join(words[-overlap_tokens:]).strip()
