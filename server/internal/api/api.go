package api

import (
	"database/sql"
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"

	"github.com/ulrichheringer/pjsuite/server/internal/storage"
)

const maxJSONBytes = 1 << 20

type server struct {
	db    *sql.DB
	files storage.Store
}

func New(db *sql.DB, files storage.Store) *echo.Echo {
	s := &server{db: db, files: files}
	e := echo.New()
	e.Use(middleware.Recover())
	e.Use(middleware.RequestLogger())

	g := e.Group("/api")
	g.GET("/health", func(c *echo.Context) error {
		if err := db.PingContext(c.Request().Context()); err != nil {
			return c.JSON(http.StatusServiceUnavailable, map[string]string{"status": "db unavailable"})
		}
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})
	bodyLimit := middleware.BodyLimit(maxJSONBytes)
	g.POST("/signup", s.signup, bodyLimit)
	g.POST("/login", s.login, bodyLimit)
	g.POST("/logout", s.logout)
	g.GET("/me", s.me, s.requireAuth)
	g.GET("/profile", s.getProfile, s.requireAuth)
	g.PUT("/profile", s.putProfile, s.requireAuth, bodyLimit)
	g.PUT("/profile/avatar", s.putAvatar, s.requireAuth)
	g.GET("/profile/avatar", s.getAvatar, s.requireAuth)
	g.GET("/clients", s.listClients, s.requireAuth)
	g.POST("/clients", s.createClient, s.requireAuth, bodyLimit)
	g.GET("/clients/:id", s.getClient, s.requireAuth)
	g.PUT("/clients/:id", s.putClient, s.requireAuth, bodyLimit)
	g.PUT("/clients/:id/stage", s.putClientStage, s.requireAuth, bodyLimit)
	g.POST("/clients/:id/archive", s.archiveClient, s.requireAuth)
	g.POST("/clients/:id/restore", s.restoreClient, s.requireAuth)
	g.GET("/projects", s.listProjects, s.requireAuth)
	g.POST("/projects", s.createProject, s.requireAuth, bodyLimit)
	g.GET("/projects/:id", s.getProject, s.requireAuth)
	g.PUT("/projects/:id", s.writableProject(s.putProject), s.requireAuth, bodyLimit)
	g.POST("/projects/:id/archive", s.archiveProject, s.requireAuth)
	g.POST("/projects/:id/duplicate", s.duplicateProject, s.requireAuth, bodyLimit)
	g.GET("/projects/:id/events", s.listProjectEvents, s.requireAuth)
	g.GET("/notifications", s.listNotifications, s.requireAuth)
	g.POST("/notifications/read-all", s.readAllNotifications, s.requireAuth)
	g.POST("/notifications/:id/read", s.readNotification, s.requireAuth)
	g.GET("/projects/:id/stages", s.listStages, s.requireAuth)
	g.POST("/projects/:id/stages", s.writableProject(s.createStage), s.requireAuth, bodyLimit)
	g.PUT("/projects/:id/stages/order", s.writableProject(s.putStageOrder), s.requireAuth, bodyLimit)
	g.PUT("/projects/:id/stages/:sid", s.writableProject(s.putStage), s.requireAuth, bodyLimit)
	g.DELETE("/projects/:id/stages/:sid", s.writableProject(s.deleteStage), s.requireAuth)
	g.PUT("/projects/:id/builder", s.writableProject(s.putBuilder), s.requireAuth, bodyLimit)
	g.GET("/projects/:id/payments", s.listPayments, s.requireAuth)
	g.PUT("/projects/:id/payments", s.writableProject(s.putPayments), s.requireAuth, bodyLimit)
	g.GET("/projects/:id/attachments", s.listAttachments, s.requireAuth)
	g.POST("/projects/:id/attachments", s.writableProject(s.uploadAttachment), s.requireAuth)
	g.GET("/projects/:id/attachments/:aid", s.downloadAttachment, s.requireAuth)
	g.DELETE("/projects/:id/attachments/:aid", s.writableProject(s.deleteAttachment), s.requireAuth)
	g.GET("/projects/:id/visibility", s.getVisibility, s.requireAuth)
	g.PUT("/projects/:id/visibility", s.writableProject(s.putVisibility), s.requireAuth, bodyLimit)
	g.GET("/projects/:id/client-view", s.getClientView, s.requireAuth)
	g.POST("/projects/:id/contract", s.writableProject(s.finalizeContract), s.requireAuth)
	g.GET("/projects/:id/contract", s.listContract, s.requireAuth)
	g.POST("/projects/:id/contract/revision", s.writableProject(s.reviseContract), s.requireAuth, bodyLimit)
	g.GET("/projects/:id/contract/:n", s.getContract, s.requireAuth)
	g.POST("/projects/:id/share", s.writableProject(s.createShare), s.requireAuth)
	g.POST("/projects/:id/share/regenerate", s.writableProject(s.regenerateShare), s.requireAuth)
	g.GET("/projects/:id/share", s.getShare, s.requireAuth)
	g.GET("/portal/:token", s.getPortal)
	g.GET("/portal/:token/events", s.listPortalEvents)
	g.POST("/portal/:token/change", s.postChange, bodyLimit)
	g.POST("/portal/:token/refuse", s.postRefuse, bodyLimit)
	g.POST("/portal/:token/sign", s.postSign, bodyLimit)
	g.GET("/portal/:token/deliveries/:n/files/:fid", s.downloadPortalFile)
	g.POST("/portal/:token/deliveries/:n/adjust", s.postAdjust, bodyLimit)
	g.POST("/portal/:token/deliveries/:n/approve", s.postApprove, bodyLimit)
	g.GET("/projects/:id/execution", s.getExecution, s.requireAuth)
	g.POST("/projects/:id/stages/:sid/tasks", s.executableProject(s.addTask), s.requireAuth, bodyLimit)
	g.POST("/projects/:id/complete", s.executableProject(s.completeProject), s.requireAuth)
	g.PUT("/projects/:id/tasks/:tid", s.executableProject(s.putTask), s.requireAuth, bodyLimit)
	g.DELETE("/projects/:id/tasks/:tid", s.executableProject(s.deleteTask), s.requireAuth)
	g.PUT("/projects/:id/stages/:sid/status", s.executableProject(s.putStageStatus), s.requireAuth, bodyLimit)
	g.GET("/projects/:id/stages/:sid/files", s.listStageFiles, s.requireAuth)
	g.POST("/projects/:id/stages/:sid/files", s.executableProject(s.uploadStageFile), s.requireAuth)
	g.GET("/projects/:id/stages/:sid/files/:fid", s.downloadStageFile, s.requireAuth)
	g.DELETE("/projects/:id/stages/:sid/files/:fid", s.executableProject(s.deleteStageFile), s.requireAuth)
	g.GET("/projects/:id/deliveries", s.listDeliveries, s.requireAuth)
	g.POST("/projects/:id/deliveries/draft/files", s.executableProject(s.uploadDraftFile), s.requireAuth)
	g.DELETE("/projects/:id/deliveries/draft/files/:fid", s.executableProject(s.deleteDraftFile), s.requireAuth)
	g.POST("/projects/:id/deliveries/draft/publish", s.executableProject(s.publishDraft), s.requireAuth, bodyLimit)
	return e
}
