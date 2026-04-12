<script setup lang="ts">
const repositoryUrl = ref("");
const providerName = ref("");
const isPrivate = ref(false);
const accessToken = ref("");
const isDefault = ref(true);
const editingId = ref<string | null>(null);
const editingHasToken = ref(false);
const replaceAccessToken = ref(false);
const clearAccessToken = ref(false);
const isModalOpen = ref(false);
const deleteTarget = ref<{
  id: string;
  repositoryUrl: string | null;
  repositoryOwner: string | null;
  repositoryName: string | null;
} | null>(null);
const errorMessage = ref("");
const successMessage = ref("");
const loading = ref(false);
const testingId = ref<string | null>(null);
const testMessages = ref<Record<string, string>>({});
const testErrorMessages = ref<Record<string, string>>({});
const deletingId = ref<string | null>(null);

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const maybeData = "data" in error ? error.data : null;
    if (maybeData && typeof maybeData === "object" && "message" in maybeData && typeof maybeData.message === "string") {
      return maybeData.message;
    }

    if ("statusMessage" in error && typeof error.statusMessage === "string" && error.statusMessage) {
      return error.statusMessage;
    }

    if ("message" in error && typeof error.message === "string" && error.message) {
      return error.message;
    }
  }

  return fallback;
}

const { data, refresh } = await useFetch<{
  gitDomains: Array<{
    id: string;
    domain: string;
    providerName: string;
    repositoryUrl: string | null;
    repositoryOwner: string | null;
    repositoryName: string | null;
    isPrivate: boolean;
    hasToken: boolean;
    isDefault: boolean;
    repositoryId: string | null;
    lastAnalysisStatus: string | null;
    lastAnalysisId: string | null;
  }>;
}>("/api/git-domains");

function resetForm() {
  repositoryUrl.value = "";
  providerName.value = "";
  isPrivate.value = false;
  accessToken.value = "";
  isDefault.value = true;
  editingId.value = null;
  editingHasToken.value = false;
  replaceAccessToken.value = false;
  clearAccessToken.value = false;
}

function openCreateModal() {
  resetForm();
  errorMessage.value = "";
  successMessage.value = "";
  isModalOpen.value = true;
}

function startEdit(item: {
  id: string;
  repositoryUrl: string | null;
  providerName: string;
  isPrivate: boolean;
  isDefault: boolean;
  hasToken: boolean;
}) {
  editingId.value = item.id;
  repositoryUrl.value = item.repositoryUrl ?? "";
  providerName.value = item.providerName;
  isPrivate.value = item.isPrivate;
  accessToken.value = "";
  isDefault.value = item.isDefault;
  editingHasToken.value = item.hasToken;
  replaceAccessToken.value = false;
  clearAccessToken.value = false;
  errorMessage.value = "";
  successMessage.value = "";
  isModalOpen.value = true;
}

function closeModal() {
  if (loading.value) {
    return;
  }

  isModalOpen.value = false;
  resetForm();
  errorMessage.value = "";
}

function openDeleteModal(item: {
  id: string;
  repositoryUrl: string | null;
  repositoryOwner: string | null;
  repositoryName: string | null;
}) {
  deleteTarget.value = {
    id: item.id,
    repositoryUrl: item.repositoryUrl,
    repositoryOwner: item.repositoryOwner,
    repositoryName: item.repositoryName
  };
  errorMessage.value = "";
  successMessage.value = "";
}

function closeDeleteModal() {
  if (deletingId.value) {
    return;
  }

  deleteTarget.value = null;
}

async function submit() {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await $fetch(editingId.value ? `/api/git-domains/${editingId.value}` : "/api/git-domains", {
      method: editingId.value ? "PUT" : "POST",
      body: {
        repositoryUrl: repositoryUrl.value,
        providerName: providerName.value,
        isPrivate: isPrivate.value,
        accessToken: accessToken.value,
        isDefault: isDefault.value,
        replaceAccessToken: editingId.value ? replaceAccessToken.value : true,
        clearAccessToken: editingId.value ? clearAccessToken.value : false
      }
    });

    successMessage.value = editingId.value
      ? "저장소 연결 정보가 수정되었습니다."
      : "저장소 연결 정보가 저장되었습니다.";
    isModalOpen.value = false;
    resetForm();
    await refresh();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "연결 정보 저장에 실패했습니다.";
  } finally {
    loading.value = false;
  }
}

async function testConnection(item: {
  id: string;
  repositoryUrl: string | null;
  isPrivate: boolean;
}) {
  if (!item.repositoryUrl) {
    testErrorMessages.value = {
      ...testErrorMessages.value,
      [item.id]: "저장소 URL이 없어 연결 테스트를 진행할 수 없습니다."
    };
    return;
  }

  testingId.value = item.id;
  testMessages.value = {
    ...testMessages.value,
    [item.id]: ""
  };
  testErrorMessages.value = {
    ...testErrorMessages.value,
    [item.id]: ""
  };

  try {
    const response = await $fetch<{
      result: {
        ok: boolean;
        headRef: string | null;
      };
    }>("/api/git-domains/test", {
      method: "POST",
      body: {
        credentialId: item.id,
        repositoryUrl: item.repositoryUrl,
        isPrivate: item.isPrivate
      }
    });

    testMessages.value = {
      ...testMessages.value,
      [item.id]: response.result.headRef
        ? `연결 성공: HEAD ${response.result.headRef}`
        : "연결 성공: 저장소 접근이 확인되었습니다."
    };
  } catch (error) {
    testErrorMessages.value = {
      ...testErrorMessages.value,
      [item.id]: getErrorMessage(error, "연결 테스트에 실패했습니다.")
    };
  } finally {
    testingId.value = null;
  }
}

async function removeConfirmed() {
  if (!deleteTarget.value) {
    return;
  }

  deletingId.value = deleteTarget.value.id;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await $fetch(`/api/git-domains/${deleteTarget.value.id}`, {
      method: "DELETE"
    });

    if (editingId.value === deleteTarget.value.id) {
      resetForm();
    }

    successMessage.value = "저장소 연결 정보가 삭제되었습니다.";
    deleteTarget.value = null;
    await refresh();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "연결 정보 삭제에 실패했습니다.";
  } finally {
    deletingId.value = null;
  }
}
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <h2>Git 연결 정보</h2>
        <p>
          저장소 경로와 액세스 토큰을 함께 저장합니다. 한 번 등록한 뒤에는 추가 입력 없이 바로 분석할 수 있습니다.
        </p>
      </div>
      <button class="button" type="button" @click="openCreateModal">연결 정보 등록</button>
    </div>

    <p v-if="successMessage" style="margin: 0 0 12px; color: var(--success);">{{ successMessage }}</p>
    <p v-if="errorMessage && !isModalOpen" style="margin: 0 0 12px; color: var(--danger);">{{ errorMessage }}</p>

    <div>
      <h3>등록된 연결 정보</h3>
      <div class="dense-list" style="margin-top: 12px;">
        <div v-if="!(data?.gitDomains?.length)" class="dense-list-item">
          <p class="muted" style="margin: 0;">등록된 연결 정보가 없습니다. 우측 상단의 등록 버튼으로 추가해주세요.</p>
        </div>
        <div v-for="item in data?.gitDomains ?? []" :key="item.id" class="dense-list-item">
          <div class="toolbar" style="justify-content: space-between; align-items: start;">
            <div style="display: grid; gap: 6px;">
              <strong>{{ item.repositoryOwner }}/{{ item.repositoryName }}</strong>
              <span class="mono muted">{{ item.repositoryUrl }}</span>
            </div>
            <div class="toolbar">
              <button
                class="button secondary"
                type="button"
                :disabled="testingId === item.id"
                @click="testConnection(item)"
              >
                {{ testingId === item.id ? "테스트 중..." : "연결 테스트" }}
              </button>
              <button class="button secondary" type="button" @click="startEdit(item)">수정</button>
              <button
                class="button secondary"
                type="button"
                :disabled="deletingId === item.id"
                @click="openDeleteModal(item)"
              >
                {{ deletingId === item.id ? "삭제 중..." : "삭제" }}
              </button>
            </div>
          </div>
          <p class="muted" style="margin: 4px 0 0;">
            {{ item.providerName }} · {{ item.domain }} · {{ item.isPrivate ? "Private" : "Public" }} ·
            {{ item.hasToken ? "토큰 등록됨" : "토큰 없음" }} · {{ item.isDefault ? "기본값" : "보조 도메인" }}
          </p>
          <p v-if="item.lastAnalysisStatus" class="muted" style="margin: 6px 0 0;">
            최근 분석 상태: {{ item.lastAnalysisStatus }}
          </p>
          <p v-if="testMessages[item.id]" style="margin: 6px 0 0; color: var(--success);">
            {{ testMessages[item.id] }}
          </p>
          <p v-if="testErrorMessages[item.id]" style="margin: 6px 0 0; color: var(--danger);">
            {{ testErrorMessages[item.id] }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-panel">
        <div class="panel-header" style="margin-bottom: 16px;">
          <div>
            <h3>{{ editingId ? "연결 정보 수정" : "연결 정보 등록" }}</h3>
            <p class="muted" style="margin: 6px 0 0;">
              저장소 URL과 해당 저장소에 접근할 토큰을 함께 저장합니다.
            </p>
          </div>
          <button class="button secondary" type="button" :disabled="loading" @click="closeModal">
            닫기
          </button>
        </div>

        <form class="form-stack" @submit.prevent="submit">
          <input
            v-model="repositoryUrl"
            class="input"
            type="url"
            placeholder="https://github.com/owner/repository"
            required
          />
          <input v-model="providerName" class="input" placeholder="표시 이름, 비워두면 도메인 사용" />
          <label style="display: flex; gap: 10px; align-items: center;">
            <input v-model="isPrivate" type="checkbox" />
            프라이빗 저장소입니다. 이 토큰으로 해당 저장소를 분석합니다.
          </label>
          <input
            v-model="accessToken"
            class="input"
            type="password"
            placeholder="프라이빗 저장소용 액세스 토큰"
            :disabled="Boolean(editingId) && !replaceAccessToken && !clearAccessToken"
          />
          <div v-if="editingId" class="dense-list-item" style="padding: 8px 10px;">
            <p class="muted" style="margin: 0;">
              현재 상태: {{ editingHasToken ? "토큰 등록됨" : "토큰 없음" }}
            </p>
            <label style="display: flex; gap: 10px; align-items: center; margin-top: 8px;">
              <input
                v-model="replaceAccessToken"
                type="checkbox"
                @change="clearAccessToken = replaceAccessToken ? false : clearAccessToken"
              />
              토큰을 새 값으로 교체
            </label>
            <label style="display: flex; gap: 10px; align-items: center; margin-top: 8px;">
              <input
                v-model="clearAccessToken"
                type="checkbox"
                @change="replaceAccessToken = clearAccessToken ? false : replaceAccessToken"
              />
              등록된 토큰 삭제
            </label>
            <p class="muted" style="margin: 8px 0 0;">
              아무 옵션도 선택하지 않으면 기존 토큰을 그대로 유지합니다.
            </p>
          </div>
          <label style="display: flex; gap: 10px; align-items: center;">
            <input v-model="isDefault" type="checkbox" />
            기본 Git 연결 정보로 사용
          </label>
          <div class="toolbar">
            <button class="button" type="submit" :disabled="loading">
              {{ loading ? "저장 중..." : editingId ? "연결 정보 수정" : "연결 정보 저장" }}
            </button>
            <button class="button secondary" type="button" :disabled="loading" @click="closeModal">
              취소
            </button>
          </div>
          <p v-if="errorMessage" style="margin: 0; color: var(--danger);">{{ errorMessage }}</p>
        </form>
      </div>
    </div>

    <div v-if="deleteTarget" class="modal-backdrop" @click.self="closeDeleteModal">
      <div class="modal-panel" style="max-width: 560px;">
        <div class="panel-header" style="margin-bottom: 16px;">
          <div>
            <h3>연결 정보 삭제 확인</h3>
            <p class="muted" style="margin: 6px 0 0;">
              삭제하면 연결된 저장소 정보와 이후 분석 시작 기준도 함께 사라집니다.
            </p>
          </div>
        </div>

        <div class="dense-list-item" style="margin-bottom: 16px;">
          <strong>{{ deleteTarget.repositoryOwner }}/{{ deleteTarget.repositoryName }}</strong>
          <p class="muted" style="margin: 8px 0 0;">
            {{ deleteTarget.repositoryUrl }}
          </p>
        </div>

        <div class="toolbar">
          <button class="button" type="button" :disabled="Boolean(deletingId)" @click="removeConfirmed">
            {{ deletingId ? "삭제 중..." : "삭제 확인" }}
          </button>
          <button class="button secondary" type="button" :disabled="Boolean(deletingId)" @click="closeDeleteModal">
            취소
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
