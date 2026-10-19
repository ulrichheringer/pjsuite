package api_test

import (
	"cmp"
	"testing"
)

func TestProjectCreateSeedsStagesByStructure(t *testing.T) {
	tests := []struct {
		structure string
		want      int
	}{
		{"blank", 0},
		{"essential", 4},
		{"suggested", 4},
		{"", 4},
	}
	for _, tt := range tests {
		t.Run(cmp.Or(tt.structure, "default"), func(t *testing.T) {
			e := newServer(t)
			a := signedUp(t, e)
			body := map[string]any{"name": "Ensaio", "clientId": clientID(t, e, a, "Ana")}
			if tt.structure != "" {
				body["structure"] = tt.structure
			}
			got := listStages(t, e, createdProject(t, e, a, body), a)
			if len(got) != tt.want {
				t.Fatalf("stages = %v", got)
			}
			if tt.want == 0 {
				return
			}
			first := got[0]
			tasks := first["tasks"].([]any)
			if first["name"] != "Descoberta e alinhamento" || first["timingKind"] != "deadline" || first["timing"] != "Até 05 out" ||
				first["deliverable"] != "Briefing aprovado" || first["visible"] != true || len(tasks) != 2 || got[3]["name"] != "Entrega final" {
				t.Fatalf("seed = %v", got)
			}
		})
	}
}
