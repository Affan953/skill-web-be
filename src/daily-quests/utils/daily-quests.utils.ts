import { startOfToday, toDate } from '../../gamification/utils/date.util';
import { DailyQuest } from '../daily-quests.interface';
import { DailyQuestResponseDto } from '../dto/daily-quest-response.dto';

/**
 * Returns a Date object representing midnight of tomorrow.
 */
export function startOfTomorrow(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Maps a Firestore document data snapshot to a structured DailyQuest object.
 */
export function mapDocToDailyQuest(
  docId: string,
  data: Record<string, any>,
): DailyQuest {
  return {
    id: docId,
    title: data.title,
    description: data.description,
    category: data.category,
    target: data.target,
    progress: data.progress ?? 0,
    rewardXP: data.rewardXP,
    completed: data.completed ?? false,
    completedAt: toDate(data.completedAt),
    createdAt: toDate(data.createdAt) || new Date(),
    expiresAt: toDate(data.expiresAt) || startOfTomorrow(),
  };
}

/**
 * Maps a DailyQuest object to a DailyQuestResponseDto.
 */
export function mapToResponseDto(quest: DailyQuest): DailyQuestResponseDto {
  const dto = new DailyQuestResponseDto();
  dto.id = quest.id;
  dto.title = quest.title;
  dto.description = quest.description;
  dto.category = quest.category;
  dto.target = quest.target;
  dto.progress = quest.progress;
  dto.rewardXP = quest.rewardXP;
  dto.completed = quest.completed;
  dto.completedAt = quest.completedAt;
  dto.createdAt = quest.createdAt;
  dto.expiresAt = quest.expiresAt;
  return dto;
}
